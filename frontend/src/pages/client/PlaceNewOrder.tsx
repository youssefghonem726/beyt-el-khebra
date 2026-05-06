import { useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { Document, Page, pdfjs } from 'react-pdf';

// PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Props {
  onNavigate: (page: string) => void;
}

type OrderType = 'package' | 'single' | null;
type ItemType = 'book' | 'booklet' | 'card' | 'sticker' | 'poster';

interface PackageItem {
  id: string;
  type: ItemType;
  data: any;
}

// =============================
// PDF PREVIEW COMPONENT
// =============================
function PdfPreview({ file }: { file: File | null }) {
  const [numPages, setNumPages] = useState(0);

  if (!file) return null;

  return (
    <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 10 }}>
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        {Array.from(new Array(numPages), (_, i) => (
          <Page key={i} pageNumber={i + 1} width={250} />
        ))}
      </Document>
    </div>
  );
}

export default function PlaceNewOrder({ onNavigate }: Props) {
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [singleType, setSingleType] = useState<ItemType | ''>('');
  const [singleData, setSingleData] = useState<any>({});

  // =============================
  // Package Logic
  // =============================
  const addItem = (type: ItemType) => {
    if (!type) return;

    const newItem: PackageItem = {
      id: crypto.randomUUID(),
      type,
      data: {},
    };

    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, data: any) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, data } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // =============================
  // Shared Item Renderer
  // =============================
  const ItemEditor = ({
    item,
    onChange,
  }: {
    item: PackageItem;
    onChange: (data: any) => void;
  }) => {
    const data = item.data || {};

    const set = (k: string, v: any) => {
      onChange({ ...data, [k]: v });
    };

    const FileSelector = (keyName: string) => (
      <>
        <select onChange={(e) => set(`${keyName}Source`, e.target.value)}>
          <option value="new">Upload New</option>
          <option value="existing">Use Existing</option>
        </select>

        {data[`${keyName}Source`] === 'existing' ? (
          <select onChange={(e) => set(`${keyName}Existing`, e.target.value)}>
            <option>Old File 1</option>
            <option>Old File 2</option>
          </select>
        ) : (
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => set(keyName, e.target.files?.[0])}
          />
        )}

        {/* PDF Preview */}
        {data[keyName] && <PdfPreview file={data[keyName]} />}
      </>
    );

    switch (item.type) {
      case 'book':
        return (
          <div className="box">
            <div className="flex-between">
              <h4>Book</h4>
              <button
                className="btn danger small"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            <label>PDF</label>
            {FileSelector('pdf')}

            <h5>Cover</h5>
            {FileSelector('cover')}

            <select onChange={(e) => set('coverFinish', e.target.value)}>
              <option>Matte</option>
              <option>Shiny</option>
              <option>Transparent</option>
            </select>

            <select onChange={(e) => set('colors', e.target.value)}>
              <option>B&W</option>
              <option>Colours</option>
            </select>

            <h5>Content</h5>
            <select onChange={(e) => set('size', e.target.value)}>
              <option>A4</option>
            </select>

            <select onChange={(e) => set('printType', e.target.value)}>
              <option>Front</option>
              <option>Front & Back</option>
            </select>

            <select onChange={(e) => set('casing', e.target.value)}>
              <option>Bashr</option>
              <option>Tak3ib</option>
            </select>
          </div>
        );

      case 'booklet':
        return (
          <div className="box">
            <div className="flex-between">
              <h4>Booklet</h4>
              <button
                className="btn danger small"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            <label>PDF</label>
            {FileSelector('pdf')}

            <select onChange={(e) => set('weight', e.target.value)}>
              <option>150g</option>
              <option>200g</option>
              <option>300g</option>
            </select>

            <select onChange={(e) => set('size', e.target.value)}>
              <option>A4</option>
              <option>A3 (Centerfold)</option>
            </select>

            <select onChange={(e) => set('colors', e.target.value)}>
              <option>B&W</option>
              <option>Colours</option>
            </select>

            <select onChange={(e) => set('printType', e.target.value)}>
              <option>Front</option>
              <option>Front & Back</option>
            </select>

            <select onChange={(e) => set('casing', e.target.value)}>
              <option>Bashr</option>
              <option>Tak3ib</option>
            </select>
          </div>
        );

      case 'card':
        return (
          <div className="box">
            <div className="flex-between">
              <h4>Card</h4>
              <button
                className="btn danger small"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            <label>Card PDF</label>
            {FileSelector('pdf')}

            <select onChange={(e) => set('weight', e.target.value)}>
              <option>200g</option>
              <option>300g</option>
            </select>

            <select onChange={(e) => set('size', e.target.value)}>
              <option>6x9</option>
              <option>3x6</option>
              <option>A5</option>
              <option>A4 div 8</option>
            </select>
          </div>
        );

      case 'sticker':
        return (
          <div className="box">
            <div className="flex-between">
              <h4>Sticker</h4>
              <button
                className="btn danger small"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            {FileSelector('file')}
          </div>
        );

      case 'poster':
        return (
          <div className="box">
            <div className="flex-between">
              <h4>🪧 Poster</h4>
              <button
                className="btn danger small"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>

            {FileSelector('file')}

            <select onChange={(e) => set('size', e.target.value)}>
              <option>A3</option>
            </select>

            <select onChange={(e) => set('printType', e.target.value)}>
              <option>Front</option>
              <option>Front & Back</option>
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell role="client" activePage="place-new-order" onNavigate={onNavigate}>
      <Topbar title="Place New Order" userName="Client Name" />

      {!orderType && (
        <section className="form-grid-2">
          <div className="box" onClick={() => setOrderType('package')}>
            <h3>Package</h3>
          </div>

          <div className="box" onClick={() => setOrderType('single')}>
            <h3>Individual Order</h3>
          </div>
        </section>
      )}

      {orderType === 'package' && (
        <section className="split">
          <article>
            <button className="global-back-btn" style={{ marginBottom: 12 }} onClick={() => setOrderType(null)}>
              ← Back
            </button>
            <h2>Add Items</h2>

            <select
              onChange={(e) => {
                addItem(e.target.value as ItemType);
                e.target.value = '';
              }}
            >
              <option value="">Select item type</option>
              <option value="book">Book</option>
              <option value="booklet">Booklet</option>
              <option value="card">Card</option>
              <option value="sticker">Sticker</option>
              <option value="poster">Poster</option>
            </select>

            {items.map((item) => (
              <ItemEditor
                key={item.id}
                item={item}
                onChange={(data) => updateItem(item.id, data)}
              />
            ))}
          </article>

          <aside className="box">
            <h3>Package Preview</h3>

            {items.length === 0 ? (
              <p>No items added</p>
            ) : (
              <ul>
                {items.map((i) => (
                  <li key={i.id}>{i.type}</li>
                ))}
              </ul>
            )}

            <button
              className="btn primary block"
              onClick={() => onNavigate('my-orders')}
            >
              Submit Package
            </button>
          </aside>
        </section>
      )}

      {orderType === 'single' && (
        <section>
          <button className="global-back-btn" style={{ marginBottom: 12 }} onClick={() => setOrderType(null)}>
            ← Back
          </button>
          <h2>Select Item Type</h2>

          <select onChange={(e) => setSingleType(e.target.value as ItemType)}>
            <option value="">Select type</option>
            <option value="book">Book</option>
            <option value="booklet">Booklet</option>
            <option value="card">Card</option>
            <option value="sticker">Sticker</option>
            <option value="poster">Poster</option>
          </select>

          {singleType && (
            <ItemEditor
              item={{ id: 'single', type: singleType, data: singleData }}
              onChange={setSingleData}
            />
          )}

          <button
            className="btn primary block"
            onClick={() => onNavigate('my-orders')}
          >
            Submit Order
          </button>
        </section>
      )}
    </AppShell>
  );
}