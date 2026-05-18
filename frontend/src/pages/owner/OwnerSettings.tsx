import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatusBadge from '../../components/StatusBadge';
import { useNavigation } from '../../context/NavigationContext';
// ─── API imports ──────────────────────────────────────────────────────────
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

// ─── Pricing row interface (matches AppSettings.pricing) ──────────────────
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
  const { navigateTopLevel } = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Existing state
  const [pricing, setPricing] = useState({ owner: 'Senior Manager', threshold: '5000' });
  const [whatsapp, setWhatsapp] = useState({ number: '+20 100 123 4455', template: 'Hello {{client_name}}, your order {{order_id}} is now {{status}}.' });
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserProfile['role']>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [savingPricingRoles, setSavingPricingRoles] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [toast, setToast] = useState('');

  // ── New state for default pricing table ──────────────────────────────────
  const [defaultPricing, setDefaultPricing] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingEditId, setPricingEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editMinQty, setEditMinQty] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Load users and default pricing in parallel ──────────────────────────
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
        setError('Could not load settings. Please try again later.');
      } finally {
        setLoading(false);
        setPricingLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Handlers (unchanged) ─────────────────────────────────────────────────
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
    const threshold = Number(pricing.threshold);
    if (!pricing.owner.trim() || Number.isNaN(threshold) || threshold < 0) {
      showToast('Enter a valid pricing owner and threshold.');
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
      showToast('Pricing roles saved.');
    } catch (err) {
      console.error('Failed to save pricing roles:', err);
      showToast('Could not save pricing roles.');
    } finally {
      setSavingPricingRoles(false);
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

  // ── Pricing table edit handlers ────────────────────────────────────────
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

  // ── Save default pricing to backend ─────────────────────────────────────
  const handleSaveDefaultPricing = async () => {
    try {
      await updatePricingSettings(defaultPricing);
      showToast('Default pricing saved.');
    } catch (err) {
      console.error(err);
      showToast('Error saving pricing.');
    }
  };

  // ── Loading & error states ───────────────────────────────────────────────
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

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <AppShell role="owner" activePage="owner-settings">
      <Topbar title="Owner Settings" />
      <section className="stack">
        {/* ── Pricing Roles (existing, unchanged) ── */}
        <article className="box">
          <h3>Pricing Roles</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Pricing Owner</label>
              <input
                className="input"
                type="text"
                value={pricing.owner}
                onChange={(e) => setPricing((p) => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Approval Threshold (EGP)</label>
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
            {savingPricingRoles ? 'Saving...' : 'Save Pricing Roles'}
          </button>
        </article>

        {/* ── Default Pricing Table (NEW) ── */}
        <article className="box">
          <h3>Default Product Pricing</h3>
          {pricingLoading ? (
            <div className="loading-state">Loading default pricing...</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Size</th>
                      <th>Paper / Material</th>
                      <th style={{ textAlign: 'right' }}>Price / Unit (EGP)</th>
                      <th style={{ textAlign: 'center' }}>Min Qty</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
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
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {fmt(row.pricePerUnit)}
                            </td>
                            <td style={{ textAlign: 'center' }}>{row.minQty}</td>
                          </>
                        )}

                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`status ${row.active ? 'done' : 'canceled'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleActive(row.id)}
                            title="Click to toggle"
                          >
                            {row.active ? 'Active' : 'Inactive'}
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
                                Save
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 12px', fontSize: 12 }}
                                onClick={() => setPricingEditId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                              onClick={() => startPricingEdit(row)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {defaultPricing.length === 0 && (
                      <tr>
                        <td colSpan={7} className="no-results">
                          No pricing rules defined.
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
                Save Default Pricing
              </button>
            </>
          )}
        </article>

        {/* ── WhatsApp (existing, unchanged) ── */}
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
          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={handleSaveWhatsapp}
            disabled={savingWhatsapp}
          >
            {savingWhatsapp ? 'Saving...' : 'Save WhatsApp Settings'}
          </button>
        </article>

        {/* ── User Management (existing, unchanged) ── */}
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
                      <button className="btn" onClick={() => setEditEmail(null)} disabled={savingUserId === u.id}>Cancel</button>
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
