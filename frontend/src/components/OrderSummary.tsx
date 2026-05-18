import { useTranslation } from 'react-i18next';

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

// English labels kept — used for type display in summary (translated via t() below)
const ITEM_TYPE_IDS: ItemType[] = ['book', 'booklet', 'card', 'sticker', 'poster'];
const ITEM_TYPE_ICONS: Record<ItemType, string> = {
  book: '📚', booklet: '📖', card: '🃏', sticker: '🏷️', poster: '🖼️',
};
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
  const { t } = useTranslation('ownerPlaceOrder');

  return (
    <div className="box">
      <h3 className="summary__heading">{t('shared.orderSummary.title')}</h3>
      <div className={styles.orderSummary__rows}>
        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>{t('shared.orderSummary.client')}</span>
          <span className={styles.orderSummary__value}>{selectedClient}</span>
        </div>

        {items.length === 0 ? (
          <p className="summary__empty">{t('shared.orderSummary.noItems')}</p>
        ) : (
          items.map(i => {
            const icon = ITEM_TYPE_ICONS[i.type] ?? '';
            return (
              <div key={i.id} className={styles.orderSummary__row}>
                <span><span className={styles.orderSummary__itemIcon}>{icon}</span>{t(`itemTypes.${i.type}`)}</span>
                <span className={`${styles.orderSummary__value} muted`}>
                  {i.data.qty ? t('shared.orderSummary.pcs', { count: Number(i.data.qty).toLocaleString() }) : '—'}
                </span>
              </div>
            );
          })
        )}

        {selectedDoc && (
          <div className={`${styles.orderSummary__row} ${styles['orderSummary__row--top']}`}>
            <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>
              {t('shared.orderSummary.file')}
            </span>
            <span className={styles.orderSummary__fileValue}>{selectedDoc.name}</span>
          </div>
        )}
      </div>

      <div className={styles.orderSummary__hint}>
        <p className={styles.orderSummary__hintText}>{t('shared.orderSummary.priceNote')}</p>
      </div>

      <button
        className="btn primary block"
        disabled={items.length === 0}
        onClick={onSubmit}
      >
        {t('shared.orderSummary.submitPackage')}
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
  const { t } = useTranslation('ownerPlaceOrder');

  const icon = singleType ? ITEM_TYPE_ICONS[singleType] : null;
  const fileName = selectedDoc
    ? selectedDoc.name
    : localPreviewFile
    ? localPreviewFile.name
    : '—';

  // Suppress unused variable warning — ITEM_TYPE_IDS used for type safety
  void ITEM_TYPE_IDS;

  return (
    <div className="box">
      <h3 className="summary__heading">{t('shared.orderSummary.title')}</h3>
      <div className={styles.orderSummary__rows}>
        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>{t('shared.orderSummary.client')}</span>
          <span className={styles.orderSummary__value}>{selectedClient}</span>
        </div>

        <div className={styles.orderSummary__row}>
          <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>
            {t('shared.orderSummary.type')}
          </span>
          {singleType ? (
            <span className={styles.orderSummary__typeBadge}>
              {icon}&nbsp;{t(`itemTypes.${singleType}`)}
            </span>
          ) : (
            <span className="muted">—</span>
          )}
        </div>

        <div className={`${styles.orderSummary__row} ${styles['orderSummary__row--top']}`}>
          <span className={`${styles.orderSummary__label} ${styles['orderSummary__label--shrink']}`}>
            {t('shared.orderSummary.file')}
          </span>
          <span className={styles.orderSummary__fileValue}>{fileName}</span>
        </div>

        <div className={styles.orderSummary__row}>
          <span className={styles.orderSummary__label}>{t('shared.orderSummary.quantity')}</span>
          <span className={styles.orderSummary__value}>
            {singleData.qty ? t('shared.orderSummary.pcs', { count: Number(singleData.qty).toLocaleString() }) : '—'}
          </span>
        </div>
      </div>

      <div className={styles.orderSummary__hint}>
        <p className={styles.orderSummary__hintText}>{t('shared.orderSummary.priceNote')}</p>
      </div>

      <button
        className="btn primary block"
        disabled={!singleType}
        onClick={onSubmit}
      >
        {t('shared.orderSummary.submitSingle')}
      </button>
    </div>
  );
}
