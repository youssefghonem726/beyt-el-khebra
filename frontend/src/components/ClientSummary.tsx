import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Invoice {
  id: string;
  order: string;
  client: string;
  total: string;
  status: string;
}

interface ClientSummaryProps {
  invoices: Invoice[];
}

function parseAmount(total: string): number {
  return parseFloat(total.replace(/[^0-9.]/g, '')) || 0;
}

function formatEGP(amount: number): string {
  return `EGP ${amount.toLocaleString('en-EG')}`;
}

export default function ClientSummary({ invoices }: ClientSummaryProps) {
  const { t } = useTranslation('accounting');
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const clientMap = useMemo(() => {
    const map: Record<string, Invoice[]> = {};
    for (const inv of invoices) {
      if (!map[inv.client]) map[inv.client] = [];
      map[inv.client].push(inv);
    }
    return map;
  }, [invoices]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.entries(clientMap)
      .filter(([client]) => !q || client.toLowerCase().includes(q))
      .map(([client, invs]) => {
        const total = invs.reduce((sum, inv) => sum + parseAmount(inv.total), 0);
        const paid = invs.filter(i => i.status.toLowerCase() === 'paid');
        const unpaid = invs.filter(i => i.status.toLowerCase() !== 'paid');
        return { client, invs, total, paid, unpaid };
      })
      .sort((a, b) => b.total - a.total);
  }, [clientMap, search]);

  return (
    <section className="table-wrap" style={{ marginTop: '1.5rem' }}>
      <div className="table-head" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{t('clientSummary.title')}</h3>
        <input
          type="text"
          placeholder={t('clientSummary.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border, #d1d5db)',
            background: 'var(--input-bg, #fff)',
            color: 'inherit',
            fontSize: '0.875rem',
            minWidth: '200px',
            outline: 'none',
          }}
        />
      </div>

      {filteredClients.length === 0 && (
        <div className="loading-state" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
          {search
            ? t('clientSummary.emptyFiltered', { search })
            : t('clientSummary.empty')}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>{t('clientSummary.colClient')}</th>
            <th>{t('clientSummary.colInvoices')}</th>
            <th>{t('clientSummary.colPaid')}</th>
            <th>{t('clientSummary.colUnpaid')}</th>
            <th>{t('clientSummary.colTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map(({ client, invs, total, paid, unpaid }) => (
            <>
              <tr
                key={client}
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedClient(expandedClient === client ? null : client)}
              >
                <td style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.5 }}>
                  {expandedClient === client ? '▼' : '▶'}
                </td>
                <td style={{ fontWeight: 600 }}>{client}</td>
                <td>{invs.length}</td>
                <td style={{ color: 'var(--success, #16a34a)' }}>{paid.length}</td>
                <td style={{ color: 'var(--warning, #d97706)' }}>{unpaid.length}</td>
                <td style={{ fontWeight: 600 }}>{formatEGP(total)}</td>
              </tr>

              {expandedClient === client && (
                <tr key={`${client}-detail`}>
                  <td colSpan={6} style={{ padding: 0, background: 'var(--row-alt-bg, #f9fafb)' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--row-alt-bg, #f3f4f6)' }}>
                          <th style={{ paddingLeft: '3rem' }}>{t('clientSummary.colInvoiceNum')}</th>
                          <th>{t('clientSummary.colOrder')}</th>
                          <th>{t('clientSummary.colInvoiceTotal')}</th>
                          <th>{t('clientSummary.colStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invs.map(inv => (
                          <tr key={inv.id}>
                            <td style={{ paddingLeft: '3rem' }}>{inv.id}</td>
                            <td>{inv.order}</td>
                            <td>{inv.total}</td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.15rem 0.6rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background:
                                    inv.status.toLowerCase() === 'paid'
                                      ? 'var(--badge-paid-bg, #dcfce7)'
                                      : 'var(--badge-unpaid-bg, #fef3c7)',
                                  color:
                                    inv.status.toLowerCase() === 'paid'
                                      ? 'var(--badge-paid-color, #15803d)'
                                      : 'var(--badge-unpaid-color, #b45309)',
                                }}
                              >
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </section>
  );
}
