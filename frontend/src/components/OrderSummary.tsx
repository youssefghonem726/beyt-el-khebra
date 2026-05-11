// ── Inlined from types.ts ───────────────────────────────────────────
type ItemType = 'book' | 'booklet' | 'card' | 'sticker' | 'poster';

interface PackageItem {
  id: string;
  type: ItemType;
  data: Record<string, any>;
}

interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount?: number;
  url?: string;
}

const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];
// ─────────────────────────────────────────────────────────────────────

import styles from './order.module.css';

// ── Package order summary ──────────────────────────────────────────────────────

interface PackageOrderSummaryProps {
  selectedClient: string;
  items: PackageItem[];
  selectedDoc: ClientDocument | null;
  onSubmit: () => void;
}

export function PackageOrderSummary({
  selectedClient,
  items,
  selectedDoc,
  onSubmit,
}: PackageOrderSummaryProps) {
  return (
    <div className="box">
      <h3 className="summary__heading">Order Summary</h3>
      <div className={styles.orderSummary__rows}>
        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>Client</span>
          <span className={styles.orderSummary__value}>{selectedClient}</span>
        </div>

        {items.length === 0 ? (
          <p className="summary__empty">No items added yet.</p>
        ) : (
          items.map(i => {
            const ti = ITEM_TYPES.find(t => t.id === i.type)!;
            return (
              <div key={i.id} className={styles.orderSummary__row}>
                <span><span className={styles.orderSummary__itemIcon}>{ti.icon}</span>{ti.label}</span>
                <span className={`${styles.orderSummary__value} muted`}>
                  {i.data.qty ? Number(i.data.qty).toLocaleString() + ' pcs' : '—'}
                </span>
              </div>
            );
          })
        )}

        {selectedDoc && (
          <div className={`${styles.orderSummary__row} ${styles['orderSummary__row--top']}`}>
            <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>File</span>
            <span className={styles.orderSummary__fileValue}>{selectedDoc.name}</span>
          </div>
        )}
      </div>

      <div className={styles.orderSummary__hint}>
        <p className={styles.orderSummary__hintText}>
          Order will be sent to the Unpriced Queue for pricing.
        </p>
      </div>

      <button
        className="btn primary block"
        disabled={items.length === 0}
        onClick={onSubmit}
      >
        Place Package Order
      </button>
    </div>
  );
}

// ── Single order summary ───────────────────────────────────────────────────────

interface SingleOrderSummaryProps {
  selectedClient: string;
  singleType: ItemType | '';
  singleData: Record<string, any>;
  selectedDoc: ClientDocument | null;
  localPreviewFile: File | null;
  onSubmit: () => void;
}

export function SingleOrderSummary({
  selectedClient,
  singleType,
  singleData,
  selectedDoc,
  localPreviewFile,
  onSubmit,
}: SingleOrderSummaryProps) {
  const typeInfo = ITEM_TYPES.find(t => t.id === singleType);
  const fileName = selectedDoc
    ? selectedDoc.name
    : localPreviewFile
    ? localPreviewFile.name
    : '—';

  return (
    <div className="box">
      <h3 className="summary__heading">Order Summary</h3>
      <div className={styles.orderSummary__rows}>
        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>Client</span>
          <span className={styles.orderSummary__value}>{selectedClient}</span>
        </div>

        <div className={styles.orderSummary__row}>
          <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>Type</span>
          {typeInfo ? (
            <span className={styles.orderSummary__typeBadge}>
              {typeInfo.icon}&nbsp;{typeInfo.label}
            </span>
          ) : (
            <span className="muted">—</span>
          )}
        </div>

        <div className={`${styles.orderSummary__row} ${styles['orderSummary__row--top']}`}>
          <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>File</span>
          <span className={styles.orderSummary__fileValue}>{fileName}</span>
        </div>

        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>Quantity</span>
          <span className={styles.orderSummary__value}>
            {singleData.qty ? Number(singleData.qty).toLocaleString() + ' pcs' : '—'}
          </span>
        </div>
      </div>

      <div className={styles.orderSummary__hint}>
        <p className={styles.orderSummary__hintText}>
          Order will be sent to the Unpriced Queue for pricing.
        </p>
      </div>

      <button
        className="btn primary block"
        disabled={!singleType}
        onClick={onSubmit}
      >
        Place Order
      </button>
    </div>
  );
}