import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import {
  getDeliveryById,
  updateDelivery,
  type DeliveryResponse,
} from '../../lib/api/deliveriesService';

function formatDate(value?: string | null, lang: string = 'en'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DeliveryViewMore() {
  return (
    <Suspense fallback={null}>
      <DeliveryViewMoreInner />
    </Suspense>
  );
}

function DeliveryViewMoreInner() {
  const { t, i18n } = useTranslation(['common', 'deliveryViewMore']);
  const { id = '' } = useParams<{ id: string }>();
  const { goBack, canGoBack, navigateTopLevel } = useNavigation();
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const loadDelivery = async () => {
    const response = await getDeliveryById(id);
    const next = response.data.data;
    setDelivery(next);
    setDate(next.scheduledDate?.slice(0, 10) || '');
    setAddress(next.address || '');
    setNotes(next.notes || '');
  };

  useEffect(() => {
    if (!id) {
      setError(t('deliveryViewMore:errors.noId'));
      setLoading(false);
      return;
    }

    loadDelivery()
      .catch((err) => {
        console.error('Failed to load delivery:', err);
        setError(t('deliveryViewMore:errors.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (payload: Parameters<typeof updateDelivery>[1]) => {
    if (!delivery) return;
    setSaving(true);
    setError(null);
    try {
      await updateDelivery(delivery.id, payload);
      await loadDelivery();
    } catch (err) {
      console.error('Failed to update delivery:', err);
      setError(t('deliveryViewMore:errors.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const lang = i18n.language;

  if (loading) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>
              {t('deliveryViewMore:actions.back')}
            </button>
          )}
          <section className="box center-card">
            <div className="loading-state">{t('deliveryViewMore:loading')}</div>
          </section>
        </main>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="page">
        <main className="track-shell">
          {canGoBack && (
            <button className="global-back-btn" onClick={goBack}>
              {t('deliveryViewMore:actions.back')}
            </button>
          )}
          <section className="box center-card">
            <div className="error-state">{error || t('deliveryViewMore:errors.notFound')}</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="track-shell">
        {canGoBack && (
          <button className="global-back-btn" onClick={goBack}>
            {t('deliveryViewMore:actions.back')}
          </button>
        )}
        <section className="box center-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2>
                {t('deliveryViewMore:title', {
                  id: delivery.id,
                  orderId: delivery.orderId,
                })}
              </h2>
              <p className="muted">
                {t('deliveryViewMore:clientLabel')}{' '}
                {delivery.clientName || t('deliveryViewMore:unknownClient')}
              </p>
            </div>
            <StatusBadge status={delivery.status} />
          </div>

          {error && (
            <div className="box" style={{ background: '#fff0f0', color: '#c0392b', marginTop: 12 }}>
              {error}
            </div>
          )}

          <div className="line" />

          <div className="form-grid-2">
            <p>
              <strong>{t('deliveryViewMore:detail.address')}:</strong>{' '}
              {delivery.address || t('deliveryViewMore:detail.addressMissing')}
            </p>
            <p>
              <strong>{t('deliveryViewMore:detail.phone')}:</strong>{' '}
              {delivery.phone || '—'}
            </p>
            <p>
              <strong>{t('deliveryViewMore:detail.driver')}:</strong>{' '}
              {delivery.driver || t('deliveryViewMore:detail.unassigned')}
            </p>
            <p>
              <strong>{t('deliveryViewMore:detail.company')}:</strong>{' '}
              {delivery.company || '—'}
            </p>
            <p>
              <strong>{t('deliveryViewMore:detail.scheduled')}:</strong>{' '}
              {formatDate(delivery.scheduledDate, lang)}
            </p>
            <p>
              <strong>{t('deliveryViewMore:detail.delivered')}:</strong>{' '}
              {formatDate(delivery.deliveredAt, lang)}
            </p>
            <p style={{ gridColumn: '1 / -1' }}>
              <strong>{t('deliveryViewMore:detail.notes')}:</strong>{' '}
              {delivery.notes || '—'}
            </p>
          </div>

          <div className="line" />
          <div className="actions-inline" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button
              className="btn primary"
              disabled={saving || delivery.status === 'delivered'}
              onClick={() => save({ status: 'delivered' })}
            >
              {t('deliveryViewMore:actions.markDelivered')}
            </button>
            <button
              className="btn"
              disabled={saving}
              onClick={() => save({ status: 'out_for_delivery' })}
            >
              {t('deliveryViewMore:actions.outForDelivery')}
            </button>
            <button
              className="btn"
              disabled={saving}
              onClick={() => save({ status: 'delayed' })}
            >
              {t('deliveryViewMore:actions.markDelayed')}
            </button>
            <button
              className="btn"
              disabled={saving}
              onClick={() => save({ status: 'lost' })}
            >
              {t('deliveryViewMore:actions.markLost')}
            </button>
          </div>

          <div className="line" />
          <div className="form-grid-2">
            <div className="field">
              <label>{t('deliveryViewMore:form.scheduledDate')}</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className="btn"
                disabled={saving || !date}
                onClick={() => save({ scheduled_date: date })}
                style={{ marginTop: 6 }}
              >
                {t('deliveryViewMore:form.saveDate')}
              </button>
            </div>
            <div className="field">
              <label>{t('deliveryViewMore:form.address')}</label>
              <textarea
                className="textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <button
                className="btn"
                disabled={saving || !address.trim()}
                onClick={() => save({ address: address.trim() })}
                style={{ marginTop: 6 }}
              >
                {t('deliveryViewMore:form.saveAddress')}
              </button>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>{t('deliveryViewMore:form.notes')}</label>
              <textarea
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                className="btn"
                disabled={saving}
                onClick={() => save({ notes: notes.trim() })}
                style={{ marginTop: 6 }}
              >
                {t('deliveryViewMore:form.saveNotes')}
              </button>
            </div>
          </div>

          <div className="actions-inline" style={{ marginTop: 16 }}>
            <button
              className="btn primary"
              onClick={() => navigateTopLevel('delivery-list')}
            >
              {t('deliveryViewMore:actions.done')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}