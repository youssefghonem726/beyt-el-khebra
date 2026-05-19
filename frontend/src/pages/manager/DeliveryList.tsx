import { Fragment, useEffect, useMemo, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import {
  getDeliveries,
  updateDelivery,
  type DeliveryResponse,
  type DeliveryStatus,
} from '../../lib/api/deliveriesService';

type ExpandKey = { id: number; action: 'reschedule' | 'address' | 'notes' } | null;

function formatDate(value: string | null, lang: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DeliveryList() {
  return (
    <Suspense fallback={null}>
      <DeliveryListInner />
    </Suspense>
  );
}

function DeliveryListInner() {
  const { t, i18n } = useTranslation(['common', 'deliveryList']);
  const { navigateTopLevel } = useNavigation();

  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expand, setExpand] = useState<ExpandKey>(null);
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const loadDeliveries = async () => {
    const response = await getDeliveries();
    setDeliveries(response.data.data);
  };

  useEffect(() => {
    loadDeliveries()
      .catch((err) => {
        console.error('Failed to load deliveries:', err);
        setError(t('deliveryList:error'));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deliveries.filter((delivery) =>
      !q ||
      String(delivery.orderId).includes(q) ||
      String(delivery.id).includes(q) ||
      (delivery.clientName || '').toLowerCase().includes(q) ||
      delivery.status.toLowerCase().includes(q)
    );
  }, [deliveries, query]);

  const patchDelivery = async (
    delivery: DeliveryResponse,
    payload: Parameters<typeof updateDelivery>[1]
  ) => {
    setSavingId(delivery.id);
    setError(null);
    try {
      await updateDelivery(delivery.id, payload);
      await loadDeliveries();
      setExpand(null);
      setDate('');
      setAddress('');
      setNotes('');
    } catch (err) {
      console.error('Failed to update delivery:', err);
      setError(t('deliveryList:updateError'));
    } finally {
      setSavingId(null);
    }
  };

  const changeStatus = (delivery: DeliveryResponse, status: DeliveryStatus) => {
    patchDelivery(delivery, { status });
  };

  const lang = i18n.language;

  if (loading) {
    return (
      <AppShell role="manager" activePage="delivery-list">
        <Topbar title={t('deliveryList:title')} />
        <div className="loading-state">{t('deliveryList:loading')}</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="manager" activePage="delivery-list">
      <Topbar title={t('deliveryList:title')} />

      {error && (
        <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <section className="table-wrap">
        <div className="table-head">
          <h3>{t('deliveryList:allDeliveries')}</h3>
          <input
            className="input"
            type="search"
            placeholder={t('deliveryList:searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-results">
                    {t('deliveryList:noResults')}
                  </td>
                </tr>
              ) : (
                filtered.map((delivery) => {
                  const isExpanded = expand?.id === delivery.id;
                  const delivered = delivery.status === 'delivered';
                  return (
                    <Fragment key={delivery.id}>
                      <tr>
                        <td>#{delivery.id}</td>
                        <td>#{delivery.orderId}</td>
                        <td>{delivery.clientName || t('deliveryList:unknownClient')}</td>
                        <td style={{ maxWidth: 220, fontSize: 12 }}>
                          {delivery.address || t('deliveryList:addressMissing')}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(delivery.scheduledDate, lang)}
                        </td>
                        <td>
                          <StatusBadge status={delivery.status} />
                        </td>
                        <td>
                          <div className="actions-inline" style={{ flexWrap: 'wrap', gap: 6 }}>
                            <button
                              className="btn"
                              onClick={() =>
                                navigateTopLevel(`/manager/deliveries/${delivery.id}`)
                              }
                            >
                              {t('deliveryList:actions.view')}
                            </button>
                            {!delivered && (
                              <button
                                className="btn primary"
                                disabled={savingId === delivery.id}
                                onClick={() => changeStatus(delivery, 'delivered')}
                              >
                                {t('deliveryList:actions.markDelivered')}
                              </button>
                            )}
                            <button
                              className="btn"
                              disabled={savingId === delivery.id}
                              onClick={() => {
                                setExpand({ id: delivery.id, action: 'reschedule' });
                                setDate('');
                              }}
                            >
                              {t('deliveryList:actions.reschedule')}
                            </button>
                            <button
                              className="btn"
                              disabled={savingId === delivery.id}
                              onClick={() => {
                                setExpand({ id: delivery.id, action: 'address' });
                                setAddress(delivery.address || '');
                              }}
                            >
                              {t('deliveryList:actions.changeAddress')}
                            </button>
                            <button
                              className="btn"
                              disabled={savingId === delivery.id}
                              onClick={() => {
                                setExpand({ id: delivery.id, action: 'notes' });
                                setNotes(delivery.notes || '');
                              }}
                            >
                              {t('deliveryList:actions.notes')}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              background: 'var(--surface-2, #f8f9fb)',
                              padding: '14px 18px',
                            }}
                          >
                            {expand.action === 'reschedule' && (
                              <div className="actions-inline" style={{ gap: 12 }}>
                                <input
                                  className="input"
                                  type="date"
                                  value={date}
                                  onChange={(e) => setDate(e.target.value)}
                                />
                                <button
                                  className="btn primary"
                                  disabled={!date}
                                  onClick={() =>
                                    patchDelivery(delivery, { scheduled_date: date })
                                  }
                                >
                                  {t('deliveryList:reschedule.save')}
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => setExpand(null)}
                                >
                                  {t('deliveryList:reschedule.cancel')}
                                </button>
                              </div>
                            )}
                            {expand.action === 'address' && (
                              <div className="actions-inline" style={{ gap: 12, alignItems: 'flex-start' }}>
                                <textarea
                                  className="textarea"
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  rows={2}
                                />
                                <button
                                  className="btn primary"
                                  disabled={!address.trim()}
                                  onClick={() =>
                                    patchDelivery(delivery, { address: address.trim() })
                                  }
                                >
                                  {t('deliveryList:address.save')}
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => setExpand(null)}
                                >
                                  {t('deliveryList:address.cancel')}
                                </button>
                              </div>
                            )}
                            {expand.action === 'notes' && (
                              <div className="actions-inline" style={{ gap: 12, alignItems: 'flex-start' }}>
                                <textarea
                                  className="textarea"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={2}
                                />
                                <button
                                  className="btn primary"
                                  onClick={() =>
                                    patchDelivery(delivery, { notes: notes.trim() })
                                  }
                                >
                                  {t('deliveryList:notes.save')}
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => setExpand(null)}
                                >
                                  {t('deliveryList:notes.cancel')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}