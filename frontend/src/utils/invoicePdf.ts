interface InvoicePdfItem {
  item_type?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
}

export interface InvoicePdfData {
  id: string | number;
  order: string;
  client: string;
  createdAt?: string | null;
  status?: string | null;
  itemSummary?: string | null;
  items?: InvoicePdfItem[];
  total: string;
  paid: string;
  remaining: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(value: number | string | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return `EGP ${amount.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function openInvoicePdf(data: InvoicePdfData): void {
  const items = data.items && data.items.length > 0
    ? data.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.item_type || 'Item')}</td>
          <td>${escapeHtml(item.quantity ?? '-')}</td>
          <td>${escapeHtml(money(item.unit_price))}</td>
          <td>${escapeHtml(money(item.total_price))}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4">${escapeHtml(data.itemSummary || 'No item breakdown available')}</td></tr>`;

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${escapeHtml(data.id)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #17212b; margin: 32px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #13b9b1; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 24px; font-weight: 700; }
        .muted { color: #5d6875; font-size: 13px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .box { border: 1px solid #d9e1e7; border-radius: 6px; padding: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 18px 0; }
        th, td { text-align: left; border-bottom: 1px solid #d9e1e7; padding: 10px; }
        th { background: #f5f8fa; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
        .totals { width: 320px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #d9e1e7; }
        .grand { font-weight: 700; font-size: 18px; }
        @media print { button { display: none; } body { margin: 20mm; } }
      </style>
    </head>
    <body>
      <button onclick="window.print()" style="float:right;padding:10px 14px;margin-bottom:16px">Print / Save PDF</button>
      <div class="header">
        <div>
          <div class="brand">Bayt El Khebra</div>
          <div class="muted">PrintApp invoice</div>
        </div>
        <div>
          <h1>Invoice #${escapeHtml(data.id)}</h1>
          <div class="muted">${escapeHtml(data.status || '-')}</div>
        </div>
      </div>
      <div class="grid">
        <div class="box">
          <div class="muted">Client</div>
          <strong>${escapeHtml(data.client || '-')}</strong>
        </div>
        <div class="box">
          <div class="muted">Order / Date</div>
          <strong>${escapeHtml(data.order || '-')}</strong><br />
          ${escapeHtml(formatDate(data.createdAt))}
        </div>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Total</span><span>${escapeHtml(data.total)}</span></div>
        <div class="total-row"><span>Paid</span><span>${escapeHtml(data.paid)}</span></div>
        <div class="total-row grand"><span>Remaining</span><span>${escapeHtml(data.remaining)}</span></div>
      </div>
      <p class="muted">Payment is handled offline / by shop confirmation.</p>
    </body>
  </html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
