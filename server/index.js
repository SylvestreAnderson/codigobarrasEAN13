import express from 'express';
import bwipjs from 'bwip-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataFile = join(root, 'data', 'products.json');
const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '16kb' }));

function readProducts() {
  return existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : [];
}

function completeEan(base) {
  const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${base}${(10 - (sum % 10)) % 10}`;
}

app.get('/api/products', (request, response) => {
  response.json(readProducts().reverse());
});

app.post('/api/products', (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  const expirationDate = request.body?.expirationDate;
  const productCode = request.body?.productCode;
  const description = typeof request.body?.description === 'string' ? request.body.description.trim() : '';
  if (description.length > 300) {
    return response.status(400).json({ error: 'A descricao deve ter ate 300 caracteres.' });
  }
  const { weight, weightUnit } = request.body || {};
  const parsedDate = typeof expirationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expirationDate)
    ? new Date(`${expirationDate}T00:00:00.000Z`) : new Date(NaN);

  if (!name || name.length > 120 || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== expirationDate) {
    return response.status(400).json({ error: 'Informe um produto de ate 120 caracteres e uma data de vencimento valida.' });
  }

  if ((weight !== undefined || weightUnit !== undefined) &&
      (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0 || weight > 999999 || !['g', 'kg'].includes(weightUnit))) {
    return response.status(400).json({ error: 'Informe um peso valido em g ou kg.' });
  }

  const products = readProducts();
  const usedCodes = new Set(products.map((item) => item.code));
  let code_ = productCode;
  if (productCode === undefined || productCode === '') {
    let sequence = 1;
    while (sequence <= 9999999 && usedCodes.has(completeEan(`200${String(sequence).padStart(9, '0')}`))) sequence += 1;
    if (sequence > 9999999) return response.status(409).json({ error: 'Limite de codigos atingido.' });
    code_ = String(sequence).padStart(7, '0');
  } else if (typeof productCode !== 'string' || !/^\d{1,7}$/.test(productCode)) {
    return response.status(400).json({ error: 'Informe o codigo do produto com ate 7 digitos.' });
  } else {
    code_ = productCode.padStart(7, '0');
  }
  const code = completeEan(`200${code_.padStart(9, '0')}`);
  if (usedCodes.has(code)) return response.status(409).json({ error: 'Ja existe um produto com este codigo.' });

  const product = { productCode: code_, code, name, ...(description ? { description } : {}), expirationDate, ...(weight !== undefined ? { weight, weightUnit } : {}), createdAt: new Date().toISOString() };
  products.push(product);
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(products, null, 2));
  response.status(201).json(product);
});

app.get('/api/products/:code/barcode.svg', (request, response) => {
  const product = readProducts().find((item) => item.code === request.params.code);
  if (!product) return response.status(404).json({ error: 'Produto nao encontrado.' });
  response.type('image/svg+xml').send(bwipjs.toSVG({ bcid: 'ean13', text: product.code, scale: 3, height: 14, includetext: true, textxalign: 'center', backgroundcolor: 'FFFFFF', padding: 8 }));
});

app.use(express.static(join(root, 'dist')));
app.listen(port, () => console.log(`API disponivel em http://localhost:${port}`));