import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import { useNavigation } from '../../context/NavigationContext';
import {
  createSupportTicket,
  getSupportContact,
  type SupportContact,
} from '../../lib/api/supportService';

const defaultContact: SupportContact = {
  phone: '01206001616',
  email: 'betelkhebra2@gmail.com',
  facebook_url: 'https://www.facebook.com/share/18neEjKj21/',
  messenger_name: 'بيت الخبرة - Bayt El Khebra',
  hours: 'Contact shop for current working hours',
};

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
  const [contact, setContact] = useState<SupportContact>(defaultContact);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupportContact()
      .then((res) => setContact({ ...defaultContact, ...res.data.data }))
      .catch(() => setContact(defaultContact));
  }, []);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSupportTicket({
        subject: form.subject.trim(),
        order_id: form.orderId.trim() || undefined,
        message: form.message.trim(),
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
                <div
                  style={{
                    background: '#fff0f0',
                    color: '#c0392b',
                    padding: '8px 12px',
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                >
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
            <li>
              {t('support:channels.email')}:{' '}
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>
              {t('support:channels.phone')}:{' '}
              <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            </li>
            <li>
              {t('support:channels.messenger')}: {contact.messenger_name}
            </li>
            <li>
              {t('support:channels.hours')}: {contact.hours}
            </li>
          </ul>
          <div className="line" />
          <button
            className="btn block"
            onClick={() => navigateTopLevel('track-order')}
          >
            {t('support:channels.trackOrder')}
          </button>
          <button
            className="btn block"
            style={{ marginTop: 8 }}
            onClick={() =>
              window.open(contact.facebook_url, '_blank', 'noopener,noreferrer')
            }
          >
            {t('support:channels.facebook')}
          </button>
          <button
            className="btn block"
            style={{ marginTop: 8 }}
            onClick={() => navigateTopLevel('place-new-order')}
          >
            {t('support:channels.newOrder')}
          </button>
        </aside>
      </section>
    </AppShell>
  );
}