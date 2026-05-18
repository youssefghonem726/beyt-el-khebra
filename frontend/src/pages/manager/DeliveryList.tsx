import { useState, useEffect, Fragment, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { getDeliveries } from '../../lib/api/deliveriesService';
import type { DeliveryResponse } from '../../lib/api/deliveriesService';
import { getOrders } from '../../lib/api/ordersQuotesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

interface Delivery {
  id: string;
  orderId: string;
  orderDisplayId: string;
  client: string;
  address: string;
  scheduledDate: string;
  status: string;
}

type ExpandKey = { id: string; action: 'reschedule' | 'address' } | null;

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DeliveryList() {
  return (
    <Suspense fallback={null}>
      <DeliveryListInner />
    </Suspense>
  );
}

function DeliveryListInner() {
  const { t } = useTranslation(['common', 'deliveryList']);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expand, setExpand]       = useState<ExpandKey>(null);
  const [date, setDate]           = useState('');
  const [address, setAddress]     = useState('');
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deliveriesRes, ordersRes, clientsRes] = await Promise.all([
          getDeliveries(), getOrders(), getClients(),
        ]);

        const deliveriesRaw: DeliveryResponse[] = deliveriesRes.data.data;
        const orders: any[] = ordersRes.data.data;
        const clients = clientsRes.data.data.results;

        const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));
        const orderCustomerMap = new Map(orders.map((o: any) => [o.id, o.customer]));

        const deliveryList: Delivery[] = deliveriesRaw.map((d: DeliveryResponse) => {
          const customerId = d.clientId || orderCustomerMap.get(d.orderId);
          const clientName = customerId ? clientMap.get(customerId) || 'Unknown' : 'Unknown';

          return {
            id: String(d.id),
            orderId: String(d.orderId),
            orderDisplayId: `#${d.orderId}`,
            client: clientName,
            address: d.address,
            scheduledDate: formatDate(d.scheduledDate),
            status: d.status,
          };
        });

        setDeliveries(deliveryList);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setDeliveries([]);
        } else {
          console.error('Failed to load deliveries:', err);
          setError(t('deliveryList:error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggle = (id: string, action: 'reschedule' | 'address') => {
    if (expand?.id === id && expand.action === action) {
      setExpand(null);
    } else {
      setExpand({ id, action });
      setDate('');
      setAddress('');
    }
  };

  const saveAndClose = () => setExpand(null);

  if (loading) {
    return (
      <AppShell role="manager" activePage="delivery-list">
        <Topbar title={t('deliveryList:title')} />
        <div className="loading-state">{t('deliveryList:loading')}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="manager" activePage="delivery-list">
        <Topbar title={t('deliveryList:title')} />
        <div className="error-state">{error}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="delivery-list">
      <Topbar title={t('deliveryList:title')} />

      <section className="table-wrap">
        <div className="table-head"><h3>{t('deliveryList:allDeliveries')}</h3></div>

        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('deliveryList:table.delivery')}</th>
                <th>{t('deliveryList:table.order')}</th>
                <th>{t('deliveryList:table.client')}</th>
                <th>{t('deliveryList:table.address')}</th>
                <th>{t('deliveryList:table.scheduled')}</th>
                <th>{t('deliveryList:table.status')}</th>
                <th>{t('deliveryList:table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const isDone      = delivered.has(d.id);
                const isCancelled = cancelled.has(d.id);
                const status      = isDone ? 'delivered' : isCancelled ? 'cancelled' : d.status;
                const isExpanded  = expand?.id === d.id;

                return (
                  <Fragment key={d.id}>
                    <tr>
                      <td><strong>{d.id}</strong></td>
                      <td>{d.orderDisplayId} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({d.orderId})</span></td>
                      <td>{d.client}</td>
                      <td style={{ maxWidth: 180, fontSize: 12 }}>{d.address}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{d.scheduledDate}</td>
                      <td><StatusBadge status={status} /></td>
                      <td>
                        {isDone || isCancelled ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {isDone ? t('deliveryList:actions.delivered') : t('deliveryList:actions.cancelled')}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn primary"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setDelivered((s) => { const n = new Set(s); n.add(d.id); return n; })}
                            >
                              {t('deliveryList:actions.markDelivered')}
                            </button>
                            <button
                              className={`btn${isExpanded && expand?.action === 'reschedule' ? ' primary' : ''}`}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => toggle(d.id, 'reschedule')}
                            >
                              {t('deliveryList:actions.reschedule')}
                            </button>
                            <button
                              className={`btn${isExpanded && expand?.action === 'address' ? ' primary' : ''}`}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => toggle(d.id, 'address')}
                            >
                              {t('deliveryList:actions.changeAddress')}
                            </button>
                            <button
                              className="btn"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#d9534f' }}
                              onClick={() => setCancelled((s) => { const n = new Set(s); n.add(d.id); return n; })}
                            >
                              {t('deliveryList:actions.cancel')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--surface-2, #f8f9fb)', padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                          {expand?.action === 'reschedule' && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div className="field" style={{ margin: 0 }}>
                                <label>{t('deliveryList:reschedule.label')}</label>
                                <input
                                  className="input"
                                  type="date"
                                  value={date}
                                  onChange={(e) => setDate(e.target.value)}
                                />
                              </div>
                              <button className="btn primary" disabled={!date} onClick={saveAndClose}>
                                {t('deliveryList:reschedule.save')}
                              </button>
                              <button className="btn" onClick={() => setExpand(null)}>
                                {t('deliveryList:reschedule.cancel')}
                              </button>
                            </div>
                          )}
                          {expand?.action === 'address' && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div className="field" style={{ margin: 0, flex: 1 }}>
                                <label>{t('deliveryList:address.label')}</label>
                                <input
                                  className="input"
                                  placeholder={t('deliveryList:address.placeholder')}
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                />
                              </div>
                              <button className="btn primary" disabled={!address.trim()} onClick={saveAndClose}>
                                {t('deliveryList:address.save')}
                              </button>
                              <button className="btn" onClick={() => setExpand(null)}>
                                {t('deliveryList:address.cancel')}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
