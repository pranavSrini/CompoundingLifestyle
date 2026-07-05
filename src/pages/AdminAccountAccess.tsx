import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  deleteAdminPartner,
  fetchAdminPartners,
  fetchAdminFeatureList,
  fetchAdminMaterialCatalog,
  patchAdminPartner,
  resetAdminPartnerPassword,
  type AdminPartnerRow,
  type MaterialCatalogGroup,
  type PartnerRole,
} from '../lib/api';
import { FEATURE_LABELS, type FeatureKey } from '../lib/features';
import { allMaterialIdsForRow, effectiveFeatureKeys, setsEqual } from '../lib/adminAccessUtils';
import './PageLayout.css';
import './Admin.css';

export default function AdminAccountAccess() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<AdminPartnerRow | null>(null);
  const [featureDefs, setFeatureDefs] = useState<{ key: string; label: string }[]>([]);
  const [catalog, setCatalog] = useState<MaterialCatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const [partners, f, c] = await Promise.all([
          fetchAdminPartners(),
          fetchAdminFeatureList(),
          fetchAdminMaterialCatalog(),
        ]);
        if (cancelled) return;
        const found = partners.find((p) => p.id === partnerId);
        if (!found) {
          setNotFound(true);
          setRow(null);
        } else {
          setRow(found);
          setFeatureDefs(f);
          setCatalog(c);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  if (!partnerId) {
    return <Navigate to="/admin" replace />;
  }

  if (!loading && notFound) {
    return <Navigate to="/admin" replace />;
  }

  const allFeatureKeys = () => featureDefs.map((d) => d.key);

  async function patchCurrent(body: Parameters<typeof patchAdminPartner>[1]) {
    if (!row) return;
    setSaving(true);
    setError(null);
    setPasswordStatus(null);
    try {
      const updated = await patchAdminPartner(row.id, body);
      setRow(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setResettingPassword(true);
    setError(null);
    setPasswordStatus(null);
    try {
      await resetAdminPartnerPassword(row.id, password);
      setPassword('');
      setPasswordStatus('Password reset. Share the temporary password with the user securely.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password reset failed');
    } finally {
      setResettingPassword(false);
    }
  }

  async function onDeleteAccount() {
    if (!row) return;
    const ok = window.confirm(`Delete ${row.email}? This removes the account and provider profile data.`);
    if (!ok) return;
    setDeleting(true);
    setError(null);
    setPasswordStatus(null);
    try {
      await deleteAdminPartner(row.id);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete account failed');
      setDeleting(false);
    }
  }

  function featureChecked(r: AdminPartnerRow, key: string): boolean {
    if (r.role === 'admin') return true;
    if (r.allowed_features === null) return true;
    return r.allowed_features.includes(key);
  }

  async function onFeatureToggle(r: AdminPartnerRow, key: FeatureKey, checked: boolean) {
    if (r.role === 'admin') return;
    const all = allFeatureKeys();
    const next = new Set<string>(r.allowed_features === null ? all : r.allowed_features);
    if (checked) next.add(key);
    else next.delete(key);
    await patchCurrent({ allowed_features: [...next] });
  }

  async function onRoleChange(r: AdminPartnerRow, next: PartnerRole) {
    if (next === 'admin') {
      await patchCurrent({ role: 'admin', allowed_features: null, allowed_material_ids: null });
      return;
    }
    await patchCurrent({
      role: next,
      allowed_features: r.allowed_features ?? null,
      allowed_material_ids: r.allowed_material_ids ?? null,
    });
  }

  function materialChecked(r: AdminPartnerRow, materialId: string): boolean {
    if (r.role === 'admin') return true;
    const full = allMaterialIdsForRow(r, catalog);
    if (!full.includes(materialId)) return false;
    if (r.allowed_material_ids === null) return true;
    return r.allowed_material_ids.includes(materialId);
  }

  async function onMaterialToggle(r: AdminPartnerRow, materialId: string, checked: boolean) {
    if (r.role === 'admin') return;
    const full = allMaterialIdsForRow(r, catalog);
    let next: Set<string>;
    if (r.allowed_material_ids === null) {
      next = new Set(full);
    } else {
      next = new Set(r.allowed_material_ids.filter((id) => full.includes(id)));
    }
    if (checked) next.add(materialId);
    else next.delete(materialId);
    const nextArr = [...next].filter((id) => full.includes(id));
    if (setsEqual(nextArr, full)) {
      await patchCurrent({ allowed_material_ids: null });
    } else {
      await patchCurrent({ allowed_material_ids: nextArr });
    }
  }

  async function clearMaterialRestrictions(r: AdminPartnerRow) {
    if (r.role === 'admin') return;
    await patchCurrent({ allowed_material_ids: null });
  }

  const visibleGroups =
    row && catalog.length > 0
      ? catalog.filter((g) => effectiveFeatureKeys(row).includes(g.feature))
      : [];

  return (
    <div className="page-layout admin-page">
      <nav className="admin-back-nav">
        <Link to="/admin" className="admin-back-link">
          <ArrowLeft size={18} aria-hidden />
          All accounts
        </Link>
      </nav>

      {loading && (
        <div className="admin-loading" aria-busy="true">
          <span className="admin-loading-dot" />
          <span className="admin-loading-dot" />
          <span className="admin-loading-dot" />
          <span className="admin-loading-text">Loading account…</span>
        </div>
      )}

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      {!loading && row && (
        <>
          <header className="page-header admin-detail-header">
            <h1>{row.name}</h1>
            <p className="page-subtitle admin-detail-email">{row.email}</p>
            <p className="admin-detail-intro">
              Adjust this account&apos;s role, which portal sections they see, and optionally hide specific downloads.
            </p>
          </header>

          <section className="admin-management-grid">
            <form className="admin-action-card" onSubmit={onPasswordReset}>
              <div>
                <h2>Reset password</h2>
                <p>
                  Set a temporary password for provider and sales rep accounts. Admin passwords are managed outside this
                  reset flow.
                </p>
              </div>
              {passwordStatus && (
                <div className="admin-success" role="status">
                  {passwordStatus}
                </div>
              )}
              <label>
                Temporary password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  disabled={row.role === 'admin' || resettingPassword || saving || deleting}
                  required
                />
              </label>
              <button
                type="submit"
                className="admin-primary-button"
                disabled={row.role === 'admin' || resettingPassword || saving || deleting}
              >
                {resettingPassword ? 'Resetting…' : 'Reset password'}
              </button>
            </form>

            <section className="admin-action-card admin-action-card--danger">
              <div>
                <h2>Delete account</h2>
                <p>
                  Remove this account and its provider profile data when it will no longer be used. This cannot be
                  undone.
                </p>
              </div>
              <button
                type="button"
                className="admin-danger-button"
                disabled={saving || resettingPassword || deleting}
                onClick={onDeleteAccount}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </section>
          </section>

          <section className={`admin-partner-card admin-detail-shell${saving ? ' admin-partner-card--saving' : ''}`}>
            <div className="admin-partner-card-head admin-detail-card-head">
              <p className="admin-detail-card-kicker">Account role</p>
              <div className="admin-partner-role">
                <select
                  className="admin-select"
                  aria-label="Account role"
                  value={row.role}
                  disabled={saving}
                  onChange={(e) => onRoleChange(row, e.target.value as PartnerRole)}
                >
                  <option value="admin">Admin</option>
                  <option value="provider">Provider</option>
                  <option value="sales_rep">Sales rep</option>
                </select>
              </div>
            </div>

            {row.role === 'admin' ? (
              <p className="admin-callout admin-callout--info">Admins have every section and every file.</p>
            ) : (
              <>
                <div className="admin-subsection admin-panel">
                  <h3 className="admin-subsection-title">Sections</h3>
                  <ul className="admin-feature-list">
                    {featureDefs.map((def) => {
                      const fk = def.key as FeatureKey;
                      return (
                        <li key={def.key}>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              checked={featureChecked(row, def.key)}
                              disabled={saving}
                              onChange={(e) => onFeatureToggle(row, fk, e.target.checked)}
                            />
                            <span>{def.label || FEATURE_LABELS[fk]}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="admin-subsection admin-panel">
                  <div className="admin-subsection-head">
                    <h3 className="admin-subsection-title">Individual files</h3>
                    {row.allowed_material_ids !== null && (
                      <button
                        type="button"
                        className="admin-link-btn"
                        disabled={saving}
                        onClick={() => clearMaterialRestrictions(row)}
                      >
                        Allow all files in their sections
                      </button>
                    )}
                  </div>
                  {row.allowed_material_ids === null ? (
                    <p className="admin-hint">
                      All files are available in each allowed section. Use the toggles below to hide specific items
                      (e.g. Product Blurbs).
                    </p>
                  ) : (
                    <p className="admin-hint admin-hint--accent">Only checked files are visible for download.</p>
                  )}

                  <div className="admin-material-groups">
                    {visibleGroups.map((group) => (
                      <div key={group.feature} className="admin-material-group">
                        <h4 className="admin-material-group-title">{group.featureLabel}</h4>
                        <ul className="admin-material-items">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              <label className="admin-check">
                                <input
                                  type="checkbox"
                                  checked={materialChecked(row, item.id)}
                                  disabled={saving}
                                  onChange={(e) => onMaterialToggle(row, item.id, e.target.checked)}
                                />
                                <span>{item.label}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
