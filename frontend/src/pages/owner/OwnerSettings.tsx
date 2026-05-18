import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import {
  getUsers,
  getSettings,
  updatePricingSettings,
  updatePricingRolesSettings,
  updateUser,
  updateWhatsappSettings,
} from '../../lib/api';
import type { UserProfile } from '../../lib/api';

interface User {
  id: number;
  email: string;
  role: UserProfile['role'];
  status: 'active' | 'inactive';
}

function toUserRow(user: UserProfile): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
  };
}

interface PricingRow {
  id: string;
  product: string;
  size: string;
  paper: string;
  pricePerUnit: number;
  minQty: number;
  active: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OwnerSettings() {
  return (
    <Suspense fallback={null}>
      <OwnerSettingsInner />
    </Suspense>
  );
}

function OwnerSettingsInner() {
  const { t } = useTranslation(['common', 'ownerSettings']);
  const { navigateTopLevel: _nav } = useNavigation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserProfile['role']>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [savingPricingRoles, setSavingPricingRoles] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [toast, setToast] = useState('');

  const [defaultPricing, setDefaultPricing] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingEditId, setPricingEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editMinQty, setEditMinQty] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, settingsRes] = await Promise.all([
          getUsers(),
          getSettings(),
        ]);
        setUsers(usersRes.data.data.map(toUserRow));
        const settings = settingsRes.data.data;
        setDefaultPricing(settings.pricing ?? []);

        if (settings.pricing_roles) {
          setPricing({
            owner: settings.pricing_roles.owner ?? 'Senior Manager',
            threshold: String(settings.pricing_roles.approval_threshold ?? 5000),
          });
        }

        if (settings.whatsapp) {
          setWhatsapp({
            number: String(settings.whatsapp.number ?? '+20 100 123 4455'),
            template: String(settings.whatsapp.template ?? 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.'),
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError(t('ownerSettings:error'));
      } finally {
        setLoading(false);
        setPricingLoading(false);
      }
    };
    fetchData();
  }, []);

  const startEdit = (u: User) => {
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const saveEdit = async () => {
    const user = users.find((u) => u.email === editEmail);
    if (!user) return;

    setSavingUserId(user.id);
    try {
      const res = await updateUser(user.id, {
        role: editRole,
        is_active: editStatus === 'active',
      });
      const updated = toUserRow(res.data.data);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditEmail(null);
      showToast(t('ownerSettings:users.toastSaved'));
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast(t('ownerSettings:users.toastError'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSavePricingRoles = async () => {
    const threshold = Number(pricing.threshold);
    if (!pricing.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast(t('ownerSettings:pricingRoles.toastInvalid'));
      return;
    }

    setSavingPricingRoles(true);
    try {
      const res = await updatePricingRolesSettings({
        owner: pricing.owner.trim(),
        approval_threshold: threshold,
      });
      setPricing({
        owner: res.data.data.value.owner,
        threshold: String(res.data.data.value.approval_threshold),
      });
      showToast(t('ownerSettings:pricingRoles.toastSaved'));
    } catch (err) {
      console.error('Failed to save pricing roles:', err);
      showToast(t('ownerSettings:pricingRoles.toastError'));
    } finally {
      setSavingPricingRoles(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsapp.number.trim() || !whatsapp.template.trim()) {
      showToast(t('ownerSettings:whatsapp.toastInvalid'));
      return;
    }

    setSavingWhatsapp(true);
    try {
      const res = await updateWhatsappSettings({
        number: whatsapp.number.trim(),
        template: whatsapp.template.trim(),
      });
      setWhatsapp({
        number: String(res.data.data.value.number ?? ''),
        template: String(res.data.data.value.template ?? ''),
      });
      showToast(t('ownerSettings:whatsapp.toastSaved'));
    } catch (err) {
      console.error('Failed to save WhatsApp settings:', err);
      showToast(t('ownerSettings:whatsapp.toastError'));
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const startPricingEdit = (row: PricingRow) => {
    setPricingEditId(row.id);
    setEditPrice(String(row.pricePerUnit));
    setEditMinQty(String(row.minQty));
  };

  const savePricingEdit = (id: string) => {
    const price = parseFloat(editPrice);
    const qty = parseInt(editMinQty, 10);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) return;
    setDefaultPricing(prev =>
      prev.map(p => p.id === id ? { ...p, pricePerUnit: price, minQty: qty } : p)
    );
    setPricingEditId(null);
  };

  const toggleActive = (id: string) => {
    setDefaultPricing(prev =>
      prev.map(p => p.id === id ? { ...p, active: !p.active } : p)
    );
  };

  const handleSaveDefaultPricing = async () => {
    try {
      await updatePricingSettings(defaultPricing);
      showToast(t('ownerSettings:defaultPricing.toastSaved'));
    } catch (err) {
      console.error(err);
      showToast(t('ownerSettings:defaultPricing.toastError'));
    }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title={t('ownerSettings:title')} />
        <section className="stack">
          <div className="loading-state">{t('ownerSettings:loading')}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title={t('ownerSettings:title')} />
        <section className="stack">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-settings">
      <Topbar title={t('ownerSettings:title')} />
      <section className="stack">

        {/* Pricing Roles */}
        <article className="box">
          <h3>{t('ownerSettings:pricingRoles.title')}</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>{t('ownerSettings:pricingRoles.owner')}</label>
              <input
                className="input"
                type="text"
                value={pricing.owner}
                onChange={(e) => setPricing((p) => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('ownerSettings:pricingRoles.threshold')}</label>
              <input
                className="input"
                type="number"
                value={pricing.threshold}
                onChange={(e) => setPricing((p) => ({ ...p, threshold: e.target.value }))}
              />
            </div>
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={handleSavePricingRoles}
            disabled={savingPricingRoles}
          >
            {savingPricingRoles ? t('ownerSettings:pricingRoles.saving') : t('ownerSettings:pricingRoles.save')}
          </button>
        </article>

        {/* Default Product Pricing */}
        <article className="box">
          <h3>{t('ownerSettings:defaultPricing.title')}</h3>
          {pricingLoading ? (
            <div className="loading-state">{t('ownerSettings:defaultPricing.loading')}</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>{t('ownerSettings:defaultPricing.colProduct')}</th>
                      <th>{t('ownerSettings:defaultPricing.colSize')}</th>
                      <th>{t('ownerSettings:defaultPricing.colPaper')}</th>
                      <th style={{ textAlign: 'right' }}>{t('ownerSettings:defaultPricing.colPrice')}</th>
                      <th style={{ textAlign: 'center' }}>{t('ownerSettings:defaultPricing.colMinQty')}</th>
                      <th style={{ textAlign: 'center' }}>{t('ownerSettings:defaultPricing.colStatus')}</th>
                      <th style={{ textAlign: 'center' }}>{t('ownerSettings:defaultPricing.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultPricing.map((row) => (
                      <tr key={row.id} style={{ opacity: row.active ? 1 : 0.5 }}>
                        <td style={{ fontWeight: 500 }}>{row.product}</td>
                        <td>{row.size}</td>
                        <td>{row.paper}</td>

                        {pricingEditId === row.id ? (
                          <>
                            <td style={{ textAlign: 'right' }}>
                              <input
                                className="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                style={{ width: 90, textAlign: 'right', padding: '4px 8px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                className="input"
                                type="number"
                                min="1"
                                value={editMinQty}
                                onChange={(e) => setEditMinQty(e.target.value)}
                                style={{ width: 70, textAlign: 'center', padding: '4px 8px' }}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(row.pricePerUnit)}</td>
                            <td style={{ textAlign: 'center' }}>{row.minQty}</td>
                          </>
                        )}

                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`status ${row.active ? 'done' : 'canceled'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleActive(row.id)}
                            title={t('ownerSettings:defaultPricing.toggleTitle')}
                          >
                            {row.active
                              ? t('ownerSettings:defaultPricing.active')
                              : t('ownerSettings:defaultPricing.inactive')}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {pricingEditId === row.id ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                className="btn primary"
                                style={{ padding: '4px 12px', fontSize: 12 }}
                                onClick={() => savePricingEdit(row.id)}
                              >
                                {t('ownerSettings:defaultPricing.save')}
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 12px', fontSize: 12 }}
                                onClick={() => setPricingEditId(null)}
                              >
                                {t('ownerSettings:defaultPricing.cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                              onClick={() => startPricingEdit(row)}
                            >
                              {t('ownerSettings:defaultPricing.edit')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {defaultPricing.length === 0 && (
                      <tr>
                        <td colSpan={7} className="no-results">
                          {t('ownerSettings:defaultPricing.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                className="btn primary"
                style={{ marginTop: 16 }}
                onClick={handleSaveDefaultPricing}
              >
                {t('ownerSettings:defaultPricing.saveAll')}
              </button>
            </>
          )}
        </article>

        {/* WhatsApp */}
        <article className="box">
          <h3>{t('ownerSettings:whatsapp.title')}</h3>
          <div className="field">
            <label>{t('ownerSettings:whatsapp.number')}</label>
            <input
              className="input"
              type="text"
              value={whatsapp.number}
              onChange={(e) => setWhatsapp((w) => ({ ...w, number: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>{t('ownerSettings:whatsapp.template')}</label>
            <textarea
              className="textarea"
              value={whatsapp.template}
              onChange={(e) => setWhatsapp((w) => ({ ...w, template: e.target.value }))}
            />
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={handleSaveWhatsapp}
            disabled={savingWhatsapp}
          >
            {savingWhatsapp ? t('ownerSettings:whatsapp.saving') : t('ownerSettings:whatsapp.save')}
          </button>
        </article>

        {/* User Management */}
        <article className="box">
          <h3>{t('ownerSettings:users.title')}</h3>
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('ownerSettings:users.colUser')}</th>
                <th>{t('ownerSettings:users.colRole')}</th>
                <th>{t('ownerSettings:users.colStatus')}</th>
                <th>{t('ownerSettings:users.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) =>
                editEmail === u.email ? (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserProfile['role'])}
                      >
                        <option value="owner">{t('ownerSettings:users.roleOwner')}</option>
                        <option value="staff">{t('ownerSettings:users.roleStaff')}</option>
                        <option value="client">{t('ownerSettings:users.roleClient')}</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                      >
                        <option value="active">{t('ownerSettings:users.statusActive')}</option>
                        <option value="inactive">{t('ownerSettings:users.statusInactive')}</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn primary" onClick={saveEdit} disabled={savingUserId === u.id}>
                        {savingUserId === u.id ? t('ownerSettings:users.saving') : t('ownerSettings:users.save')}
                      </button>
                      <button className="btn" onClick={() => setEditEmail(null)} disabled={savingUserId === u.id}>
                        {t('ownerSettings:users.cancel')}
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      <button className="btn" onClick={() => startEdit(u)}>
                        {t('ownerSettings:users.edit')}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </article>

      </section>
      {toast && <div className="success-toast">{toast}</div>}
    </AppShell>
  );
}
