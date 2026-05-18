import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
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
        setError('Could not load settings. Please try again later.');
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
      showToast('User updated.');
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('Could not update user.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSavePricingRoles = async () => {
    const threshold = Number(pricingRoles.threshold);
    if (!pricingRoles.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast('Enter a valid pricing owner and threshold.');
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
      showToast('Pricing roles saved.');
    } catch (err) {
      console.error('Failed to save pricing roles:', err);
      showToast('Could not save pricing roles.');
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
      showToast('Enter a valid price.');
      return;
    }

    setSavingPricingKey(key);
    try {
      const res = await updateDefaultPricing({ [key]: price });
      setDefaultPricing(res.data.data);
      setPricingEditKey(null);
      showToast('Default price saved.');
    } catch (err) {
      console.error('Failed to save default pricing:', err);
      showToast('Could not save default price.');
    } finally {
      setSavingPricingKey(null);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsapp.number.trim() || !whatsapp.template.trim()) {
      showToast('Enter a WhatsApp number and template.');
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
      showToast('WhatsApp settings saved.');
    } catch (err) {
      console.error('Failed to save WhatsApp settings:', err);
      showToast('Could not save WhatsApp settings.');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title="Owner Settings" />
        <section className="stack">
          <div className="loading-state">Loading settings...</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="owner" activePage="owner-settings">
        <Topbar title="Owner Settings" />
        <section className="stack">
          <div className="error-state">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-settings">
      <Topbar title="Owner Settings" />
      <section className="stack">
        <article className="box">
          <h3>Pricing Roles</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Pricing Owner</label>
              <input
                className="input"
                type="text"
                value={pricingRoles.owner}
                onChange={(e) => setPricingRoles((p) => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Approval Threshold (EGP)</label>
              <input
                className="input"
                type="number"
                value={pricingRoles.threshold}
                onChange={(e) => setPricingRoles((p) => ({ ...p, threshold: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={handleSavePricingRoles} disabled={savingPricingRoles}>
            {savingPricingRoles ? 'Saving...' : 'Save Pricing Roles'}
          </button>
        </article>

        <article className="box">
          <h3>Default Product Pricing</h3>
          <p className="muted" style={{ marginTop: -4 }}>
            These prices come from the default pricing row and are used when a client has no custom pricing.
          </p>
          {!defaultPricing ? (
            <p className="no-results">No default pricing row is configured yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Price (EGP)</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
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
                                {savingPricingKey === field.key ? 'Saving...' : 'Save'}
                              </button>
                              <button className="btn" onClick={() => setPricingEditKey(null)} disabled={savingPricingKey === field.key}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button className="btn" onClick={() => startPricingEdit(field.key)}>
                              Edit
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

        <article className="box">
          <h3>Notification Format (WhatsApp Integration)</h3>
          <div className="field">
            <label>WhatsApp Business Number</label>
            <input
              className="input"
              type="text"
              value={whatsapp.number}
              onChange={(e) => setWhatsapp((w) => ({ ...w, number: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Message Template</label>
            <textarea
              className="textarea"
              value={whatsapp.template}
              onChange={(e) => setWhatsapp((w) => ({ ...w, template: e.target.value }))}
            />
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={handleSaveWhatsapp} disabled={savingWhatsapp}>
            {savingWhatsapp ? 'Saving...' : 'Save WhatsApp Settings'}
          </button>
        </article>

        <article className="box">
          <h3>User Management</h3>
          <table className="orders-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) =>
                editEmail === u.email ? (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <select className="select" value={editRole} onChange={(e) => setEditRole(e.target.value as UserProfile['role'])}>
                        <option value="owner">Owner</option>
                        <option value="staff">Staff</option>
                        <option value="client">Client</option>
                      </select>
                    </td>
                    <td>
                      <select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn primary" onClick={saveEdit} disabled={savingUserId === u.id}>
                        {savingUserId === u.id ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn" onClick={() => setEditEmail(null)} disabled={savingUserId === u.id}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td><button className="btn" onClick={() => startEdit(u)}>Edit</button></td>
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
