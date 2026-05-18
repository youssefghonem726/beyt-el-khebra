import { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import { createSupportTicket } from '../../lib/api/supportService';

export default function Support() {
  return (
    <Suspense fallback={null}>
      <SupportInner />
    </Suspense>
  );
}

function SupportInner() {
  const { t } = useTranslation(['common', 'support']);
  const { navigateTopLevel } = useNavigation();
  const [form, setForm] = useState({ subject: '', orderId: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSend = async () => {
    if (!form.subject || !form.message) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSupportTicket({
        subject: form.subject,
        order_id: form.orderId || undefined,
        message: form.message,
      });
      setSent(true);
    } catch (err) {
      setError(t('support:error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell role="client" activePage="support">
      <Topbar title={t('support:title')} />
      <section className="split">
        <article className="box">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>✓</p>
              <h3 style={{ marginBottom: 8 }}>{t('support:success.title')}</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
                {t('support:success.sub')}
              </p>
              <button
                className="btn primary"
                onClick={() => {
                  setSent(false);
                  setForm({ subject: '', orderId: '', message: '' });
                }}
              >
                {t('support:success.sendAnother')}
              </button>
            </div>
          ) : (
            <>
              <h3>{t('support:form.title')}</h3>
              {error && (
                <div style={{ background: '#fff0f0', color: '#c0392b', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <div className="field">
                <label>{t('support:form.subject')}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t('support:form.subjectPlaceholder')}
                  value={form.subject}
                  onChange={set('subject')}
                />
              </div>
              <div className="field">
                <label>{t('support:form.orderId')}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t('support:form.orderIdPlaceholder')}
                  value={form.orderId}
                  onChange={set('orderId')}
                />
              </div>
              <div className="field">
                <label>{t('support:form.message')}</label>
                <textarea
                  className="textarea"
                  placeholder={t('support:form.messagePlaceholder')}
                  value={form.message}
                  onChange={set('message')}
                />
              </div>
              <button
                className="btn primary"
                style={{ marginTop: 8 }}
                onClick={handleSend}
                disabled={!form.subject || !form.message || submitting}
              >
                {submitting ? t('support:form.sending') : t('support:form.send')}
              </button>
            </>
          )}
        </article>
        <aside className="box">
          <h3>{t('support:channels.title')}</h3>
          <ul>
            <li>{t('support:channels.email')}</li>
            <li>{t('support:channels.phone')}</li>
            <li>{t('support:channels.hours')}</li>
          </ul>
          <div className="line" />
          <button className="btn block" onClick={() => navigateTopLevel('track-order')}>
            {t('support:channels.trackOrder')}
          </button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => navigateTopLevel('place-new-order')}>
            {t('support:channels.newOrder')}
          </button>
        </aside>
      </section>
    </AppShell>
  );
}
