import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Text, View } from 'react-native-web';
import { ArrowDownToLine, ArrowRight, Barcode, CalendarDays, Check, ChevronRight, Copy, Package, Printer, Scale, Sparkles, Trash2, Upload } from 'lucide-react';
import './styles.css';

const formatDate = (date) => date ? date.split('-').reverse().join('/') : '--/--/----';

function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem (PNG, JPG ou SVG).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Imagem invalida.'));
      image.onload = () => {
        const scale = Math.min(1, 400 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [code, setCode] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logo, setLogo] = useState(() => localStorage.getItem('company-logo') || '');

  async function changeLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readLogoFile(file);
      localStorage.setItem('company-logo', dataUrl);
      setLogo(dataUrl);
      setError('');
    } catch (logoError) {
      setError(logoError.message || 'Nao foi possivel carregar o logo.');
    }
  }

  function removeLogo() {
    localStorage.removeItem('company-logo');
    setLogo('');
  }

  useEffect(() => {
    fetch('/api/products')
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((items) => { setProducts(items); setSelected(items[0] || null); })
      .catch(() => setError('Nao foi possivel carregar os produtos. Verifique se a API esta em execucao.'));
  }, []);

  async function createProduct(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, expirationDate, productCode: code, weight: Number(weight), weightUnit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel gerar a etiqueta.');
      setProducts((current) => [result, ...current]);
      setSelected(result);
      setName('');
      setDescription('');
      setExpirationDate('');
      setCode('');
      setWeight('');
      setWeightUnit('g');
      setCopied(false);
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel conectar a API.');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Nao foi possivel copiar o codigo.');
    }
  }

  return (
    <View className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><Barcode size={22} strokeWidth={2.2} /></div><span>etiqueta<span className="brand-dot">.</span></span></div>
        <div className="topbar-right"><span className="status-dot" /> ESPACO DE TRABALHO <span className="topbar-divider" /> <span className="workspace-avatar">E</span></div>
      </header>

      <main className="main-content">
        <div className="breadcrumb">FERRAMENTAS <ChevronRight size={13} /> <span>GERADOR EAN-13</span></div>
        <div className="page-heading">
          <div><div className="eyebrow"><span /> ORGANIZE SEUS PRODUTOS</div><h1>Uma etiqueta, tudo em ordem<span>.</span></h1><p>Crie codigos de barras para identificar seus produtos com praticidade.</p></div>
          <div className="heading-mark"><Barcode size={44} strokeWidth={1.2} /><span>EAN<br />13</span></div>
        </div>

        <div className="workspace-grid">
          <section className="form-section">
            <div className="section-heading"><div className="step-number">01</div><div><h2>Dados do produto</h2><p>Comece preenchendo as informacoes abaixo.</p></div></div>
            <form onSubmit={createProduct}>
              <label htmlFor="name">Nome do produto <span>*</span></label>
              <div className="input-wrap"><Package size={18} /><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Cafe torrado 500g" maxLength={120} required /></div>
              <label htmlFor="description">Descricao do produto (opcional)</label>
              <div className="input-wrap"><Package size={18} /><input id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Embalagem a vacuo, torra media" maxLength={300} /></div>
              <label htmlFor="expiration">Data de vencimento <span>*</span></label>
              <div className="input-wrap"><CalendarDays size={18} /><input id="expiration" type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} required /></div>
              <label htmlFor="weight">Peso <span>*</span></label>
              <div className="input-wrap"><Scale size={18} /><input id="weight" type="number" min="0.001" max="999999" step="any" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Ex.: 500" required /><select aria-label="Unidade de peso" value={weightUnit} onChange={(event) => setWeightUnit(event.target.value)}><option value="g">g</option><option value="kg">kg</option></select></div>
              <label htmlFor="code">Codigo do produto (opcional)</label>
                            <div className="input-wrap"><Barcode size={18} /><input id="code" type="text" inputMode="numeric" pattern="[0-9]{1,7}" maxLength={7} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="ate 7 digitos - vazio gera automatico" title="Informe ate 7 digitos ou deixe vazio" /></div>
              {error && <div className="error" role="alert">{error}</div>}
              <button className="primary-button" disabled={loading} type="submit">{loading ? 'Gerando...' : 'Gerar etiqueta'} <ArrowRight size={18} /></button>
            </form>
            <div className="note"><div className="note-icon"><Sparkles size={16} /></div><p><strong>Bom saber</strong><br />Codigos gerados automaticamente sao para uso interno. Para venda no varejo, utilize um codigo licenciado pela GS1.</p></div>
          </section>

          <section className="preview-section">
            <div className="section-heading preview-heading"><div className="step-number">02</div><div><h2>Sua etiqueta</h2><p>Pronta para identificar seu produto.</p></div><span className="preview-tag">PRE-VISUALIZACAO</span></div>
            <div className="preview-area">
              <div className="preview-caption"><span>ETIQUETA DO PRODUTO</span><span>EAN-13</span></div>
              <div className="label" id="print-label">
                <div className="label-top"><span>IDENTIFICACAO DO PRODUTO</span>{logo ? <img className="label-logo" src={logo} alt="Logo da empresa" /> : <Barcode size={19} />}</div>
                <h3>{selected?.name || 'Nome do produto'}</h3>
                {selected?.description && <p className="label-description">{selected.description}</p>}
                <div className="label-date"><span>VALIDADE</span><strong>{formatDate(selected?.expirationDate)}</strong></div>
                {selected?.weight != null && <div className="label-date"><span>PESO</span><strong>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 }).format(selected.weight)} {selected.weightUnit}</strong></div>}
                <div className="label-divider" />
                {selected ? <img className="barcode-image" src={`/api/products/${selected.code}/barcode.svg`} alt={`Codigo de barras EAN-13 ${selected.code}`} /> : <div className="barcode-placeholder"><Barcode size={77} strokeWidth={1} /><span>Seu codigo aparecera aqui</span></div>}
              </div>
              <div className="preview-bottom"><span><span className="tiny-dot" /> {selected ? 'ETIQUETA GERADA' : 'AGUARDANDO DADOS'}</span><span>FORMATO EAN-13</span></div>
            </div>
            <div className="preview-actions">
              <label className="action-button" style={{ cursor: 'pointer' }}><Upload size={17} /> {logo ? 'Trocar logo' : 'Carregar logo'}<input type="file" accept="image/*" onChange={changeLogo} hidden /></label>
              {logo && <button type="button" className="action-button" onClick={removeLogo}><Trash2 size={17} /> Remover logo</button>}
              <button type="button" className="action-button" disabled={!selected} onClick={() => window.print()}><Printer size={17} /> Imprimir</button>
              <a className={`action-button ${!selected ? 'disabled' : ''}`} href={selected ? `/api/products/${selected.code}/barcode.svg` : undefined} download={selected ? `ean13-${selected.code}.svg` : undefined} aria-disabled={!selected}><ArrowDownToLine size={17} /> Baixar SVG</a>
              <button type="button" className="icon-button" disabled={!selected} onClick={copyCode} title="Copiar codigo" aria-label="Copiar codigo">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
          </section>
        </div>

        <section className="history-section">
          <div className="history-heading"><div><div className="eyebrow history-eyebrow"><span /> SUA BIBLIOTECA</div><h2>Etiquetas recentes <span>{String(products.length).padStart(2, '0')}</span></h2></div><span className="history-meta">SEUS PRODUTOS, EM UM SO LUGAR</span></div>
          {products.length === 0 ? <div className="empty-history"><Package size={20} /><span>Nenhuma etiqueta criada ainda.</span></div> : <div className="product-list">{products.map((product, index) => <button key={`${product.code}-${index}`} className={`product-row ${selected === product ? 'selected' : ''}`} type="button" onClick={() => { setSelected(product); setCopied(false); }}><span className="product-icon"><Package size={18} /></span><span className="product-name">{product.name}<small>{product.productCode ? `${product.productCode} · ` : ''}{product.code}</small></span><span className="product-date"><small>VALIDADE</small>{formatDate(product.expirationDate)}</span><ChevronRight size={18} className="row-arrow" /></button>)}</div>}
        </section>
      </main>
      <footer><span>etiqueta<span className="brand-dot">.</span></span><Text>FEITO PARA FACILITAR O SEU DIA A DIA</Text><Text>EAN-13 / USO INTERNO</Text></footer>
    </View>
  );
}

createRoot(document.getElementById('root')).render(<App />);