import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../context/NavigationContext';
import { getDeliveryById } from '../../lib/api/deliveriesService';
import type { DeliveryResponse } from '../../lib/api/deliveriesService';
import { getClients } from '../../lib/api/invoicesClientsSettingsService';

type ActionState = 'delivered' | 'rescheduled' | 'cancelled' | 'address-changed' | null;

function getShortOrderId(orderId: number): string {
  return `#${orderId}`;
}

export default function DeliveryViewMore() {
  return (
    <Suspense fallback={null}>
      <DeliveryViewMoreInner />
    </Suspense>
  );
}

function DeliveryViewMoreInner() {
  const { t } = useTranslation(['common', 'deliveryViewMore']);
  const { id: deliveryId = '' } = useParams<{ id: string }>();
  const { goBack, canGoBack, navigateTopLevel } = useNavigation();
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [action, setAction] = useState<ActionState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDisplayId, setOrderDisplayId] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!deliveryId) {
      setError(t('deliveryViewMore:errors.noId'));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [deliveryRes, clientsRes] = await Promise.all([
          getDeliveryById(deliveryId),
          getClients(),
        ]);

        const delivery: DeliveryResponse = deliveryRes.data.data;
        const clients = clientsRes.data.data.results;

        const client = clients.find((c: any) => Number(c.id) === delivery.clientId);
        setClientName(client ? client.name : 'Unknown');
        setOrderDisplayId(getShortOrderId(delivery.orderId));
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError(t('deliveryViewMore:errors.notFound', { id: deliveryId }));
        } else {
          console.error('Failed to load delivery:', err);
          setError(t('deliveryViewMore:errors.loadFailed'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deliveryId]);

  const confirm = (type: ActionState) => setAction(type);

  if (loading) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>{t('deliveryViewMore:actions.back')}</button>
          )}
          <section className="box center-card">
            <div className="loading-state">{t('deliveryViewMore:loading')}</div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>{t('deliveryViewMore:actions.back')}</button>
          )}
          <section className="box center-card">
            <div className="error-state">{error}</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="track-shell">
        {canGoBack && (
          <button className="global-back-btn" onClick={goBack}>{t('deliveryViewMore:actions.back')}</button>
        )}
        <section className="box center-card">
          <h2>{t('deliveryViewMore:title', { orderId: orderDisplayId })}</h2>
          <p className="muted">{t('deliveryViewMore:clientLabel')} {clientName}</p>
          <p className="muted">{t('deliveryViewMore:description')}</p>
          <div className="line" />

          {action === 'delivered' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#166534' }}>{t('deliveryViewMore:confirmed.delivered.title')}</strong>
              <p style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>{t('deliveryViewMore:confirmed.delivered.message', { orderId: orderDisplayId })}</p>
            </div>
          )}
          {action === 'rescheduled' && date && (
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#1d4ed8' }}>{t('deliveryViewMore:confirmed.rescheduled.title')}</strong>
              <p style={{ color: '#1e40af', fontSize: 13, marginTop: 4 }}>{t('deliveryViewMore:confirmed.rescheduled.message', { date })}</p>
            </div>
          )}
          {action === 'cancelled' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#991b1b' }}>{t('deliveryViewMore:confirmed.cancelled.title')}</strong>
              <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{t('deliveryViewMore:confirmed.cancelled.message', { orderId: orderDisplayId })}</p>
            </div>
          )}
          {action === 'address-changed' && address && (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <strong style={{ color: '#854d0e' }}>{t('deliveryViewMore:confirmed.addressChanged.title')}</strong>
              <p style={{ color: '#92400e', fontSize: 13, marginTop: 4 }}>{t('deliveryViewMore:confirmed.addressChanged.message', { address })}</p>
            </div>
          )}

          {!action && (
            <div className="stack">
              <button className="btn primary block" onClick={() => confirm('delivered')}>{t('deliveryViewMore:actions.markDelivered')}</button>
              <button className="btn block" onClick={() => confirm('rescheduled')}>{t('deliveryViewMore:actions.reschedule')}</button>
              <button className="btn block" onClick={() => confirm('cancelled')}>{t('deliveryViewMore:actions.cancel')}</button>
              <button className="btn block" onClick={() => confirm('address-changed')}>{t('deliveryViewMore:actions.changeAddress')}</button>
            </div>
          )}

          {(action === 'rescheduled' || action === 'address-changed') && (
            <>
              <div className="line" />
              {action === 'rescheduled' && (
                <div className="field">
                  <label>{t('deliveryViewMore:form.newDate')}</label>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
              {action === 'address-changed' && (
                <div className="field">
                  <label>{t('deliveryViewMore:form.newAddress')}</label>
                  <textarea className="textarea" placeholder={t('deliveryViewMore:form.addressPlaceholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              )}
            </>
          )}

          <div className="actions-inline" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => { setAction(null); setDate(''); setAddress(''); }}>{t('deliveryViewMore:actions.reset')}</button>
            <button className="btn primary" onClick={() => navigateTopLevel('delivery-list')}>{t('deliveryViewMore:actions.done')}</button>
          </div>
        </section>
      </main>
    </div>
  );
}
