import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
import {
  getSettings,
  getUsers,
  updatePricingRolesSettings,
  updateUser,
  updateWhatsappSettings,
} from '../../lib/api';
import type { UserProfile } from '../../lib/api';
import {
  getDefaultPricing,
  updateDefaultPricing,
  type PricingRow as ApiPricingRow,
} from '../../lib/api/pricingService';

interface User {
  id: number;
  email: string;
  role: UserProfile['role'];
  status: 'active' | 'inactive';
}

type PricingKey = Exclude<keyof ApiPricingRow, 'id' | 'created_at' | 'user' | 'source'>;

const PRICING_FIELDS: Array<{ key: PricingKey; label: string }> = [
  { key: 'front', label: 'Front' },
  { key: 'front_and_back', label: 'Front & Back' },
  { key: 'digital_cover_300g', label: 'Digital Cover 300g' },
  { key: 'digital_cover_200g', label: 'Digital Cover 200g' },
  { key: 'offset_cover_200g', label: 'Offset Cover 200g' },
  { key: 'offset_cover_300g', label: 'Offset Cover 300g' },
  { key: 'coil_size_10', label: 'Coil Size 10' },
  { key: 'coil_size_12', label: 'Coil Size 12' },
  { key: 'coil_size_14', label: 'Coil Size 14' },
  { key: 'coil_size_16', label: 'Coil Size 16' },
  { key: 'coil_size_18', label: 'Coil Size 18' },
  { key: 'coil_size_20', label: 'Coil Size 20' },
  { key: 'coil_size_22', label: 'Coil Size 22' },
  { key: 'coil_size_25', label: 'Coil Size 25' },
  { key: 'coil_size_28', label: 'Coil Size 28' },
  { key: 'coil_size_30', label: 'Coil Size 30' },
  { key: 'coil_size_32', label: 'Coil Size 32' },
  { key: 'coil_size_35', label: 'Coil Size 35' },
];

function toUserRow(user: UserProfile): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
  };
}

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  const [pricingRoles, setPricingRoles] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({
    number: '+20 100 123 4455',
    template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.',
  });
  const [defaultPricing, setDefaultPricing] = useState<ApiPricingRow | null>(null);
  const [pricingEditKey, setPricingEditKey] = useState<PricingKey | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserProfile['role']>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [savingPricingKey, setSavingPricingKey] = useState<PricingKey | null>(null);
  const [savingPricingRoles, setSavingPricingRoles] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, settingsRes, pricingRes] = await Promise.all([
          getUsers(),
          getSettings(),
          getDefaultPricing(),
        ]);

        setUsers(usersRes.data.data.map(toUserRow));
        setDefaultPricing(pricingRes.data.data);

        const settings = settingsRes.data.data;
        if (settings.pricing_roles) {
          setPricingRoles({
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
    const threshold = Number(pricingRoles.threshold);
    if (!pricingRoles.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast(t('ownerSettings:pricingRoles.toastInvalid'));
      return;
    }

    setSavingPricingRoles(true);
    try {
      const res = await updatePricingRolesSettings({
        owner: pricingRoles.owner.trim(),
        approval_threshold: threshold,
      });
      setPricingRoles({
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

  const startPricingEdit = (key: PricingKey) => {
    setPricingEditKey(key);
    setEditPrice(String(defaultPricing?.[key] ?? 0));
  };

  const savePricingField = async (key: PricingKey) => {
    const price = Number(editPrice);
    if (Number.isNaN(price) || price < 0) {
      showToast(t('ownerSettings:defaultPricing.invalidPrice'));
      return;
    }

    setSavingPricingKey(key);
    try {
      const res = await updateDefaultPricing({ [key]: price });
      setDefaultPricing(res.data.data);
      setPricingEditKey(null);
      showToast(t('ownerSettings:defaultPricing.toastSaved'));
    } catch (err) {
      console.error('Failed to save default pricing:', err);
      showToast(t('ownerSettings:defaultPricing.toastError'));
    } finally {
      setSavingPricingKey(null);
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
                value={pricingRoles.owner}
                onChange={(e) => setPricingRoles((p) => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('ownerSettings:pricingRoles.threshold')}</label>
              <input
                className="input"
                type="number"
                value={pricingRoles.threshold}
                onChange={(e) => setPricingRoles((p) => ({ ...p, threshold: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={handleSavePricingRoles} disabled={savingPricingRoles}>
            {savingPricingRoles ? t('ownerSettings:pricingRoles.saving') : t('ownerSettings:pricingRoles.save')}
          </button>
        </article>

        {/* Default Product Pricing */}
        <article className="box">
          <h3>{t('ownerSettings:defaultPricing.title')}</h3>
          <p className="muted" style={{ marginTop: -4 }}>
            {t('ownerSettings:defaultPricing.subtitle')}
          </p>
          {!defaultPricing ? (
            <p className="no-results">{t('ownerSettings:defaultPricing.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>{t('ownerSettings:defaultPricing.colItem')}</th>
                    <th style={{ textAlign: 'right' }}>{t('ownerSettings:defaultPricing.colPrice')}</th>
                    <th style={{ textAlign: 'center' }}>{t('ownerSettings:defaultPricing.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_FIELDS.map((field) => {
                    const isEditing = pricingEditKey === field.key;
                    return (
                      <tr key={field.key}>
                        <td>{field.label}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {isEditing ? (
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              style={{ width: 120, textAlign: 'right' }}
                            />
                          ) : (
                            fmt(defaultPricing[field.key] as number | null)
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                              <button
                                className="btn primary"
                                onClick={() => savePricingField(field.key)}
                                disabled={savingPricingKey === field.key}
                              >
                                {savingPricingKey === field.key ? t('ownerSettings:defaultPricing.saving') : t('ownerSettings:defaultPricing.save')}
                              </button>
                              <button className="btn" onClick={() => setPricingEditKey(null)} disabled={savingPricingKey === field.key}>
                                {t('ownerSettings:defaultPricing.cancel')}
                              </button>
                            </div>
                          ) : (
                            <button className="btn" onClick={() => startPricingEdit(field.key)}>
                              {t('ownerSettings:defaultPricing.edit')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          <button className="btn primary" style={{ marginTop: 12 }} onClick={handleSaveWhatsapp} disabled={savingWhatsapp}>
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