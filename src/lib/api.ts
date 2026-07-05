// In dev, use relative /api (Vite proxies to backend). In prod, set VITE_API_URL.
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const TOKEN_KEY = 'cl_partner_token';
export const PARTNER_KEY = 'cl_partner';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export type PartnerRole = 'admin' | 'provider' | 'sales_rep';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data as {
    token: string;
    partner: {
      id: string;
      email: string;
      name: string;
      role: PartnerRole;
      allowedFeatures: string[];
    };
  };
}

export async function fetchMaterials() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load materials');
  return data;
}

/** Catalog & pricing rows — filtered server-side by partner material access */
export interface CatalogPricingItem {
  id: string;
  title: string;
  category: string;
  fileType: string;
  description?: string;
  fileName?: string;
}

export type EditableMaterialFeature =
  | 'catalog_pricing'
  | 'state_licenses'
  | 'dosing'
  | 'coas'
  | 'patient_education';

export interface EditableMaterialItem {
  id: string;
  feature: EditableMaterialFeature;
  title: string;
  category: string;
  fileType: string;
  fileName: string;
  description?: string;
}

export async function fetchCatalogAndPricing(): Promise<CatalogPricingItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/catalog-and-pricing`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load catalog');
  return data.catalogAndPricing ?? [];
}

export interface DosingGuideItem {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileName?: string;
  description?: string;
}

export async function fetchDosingGuides(): Promise<DosingGuideItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/dosing`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load dosing guides');
  return data.dosingGuides ?? [];
}

export interface CoAItem {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileName?: string;
  description?: string;
}

export async function fetchCoas(): Promise<CoAItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/coas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load CoAs');
  return data.coas ?? [];
}

export interface StateLicenseItem {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileName?: string;
  description?: string;
}

export async function fetchStateLicenses(): Promise<StateLicenseItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/state-licenses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load state licenses');
  return data.stateLicenses ?? [];
}

export interface PatientBrochureItem {
  id: string;
  title: string;
  description: string;
  filePath: string;
}

export async function fetchPatientBrochures(): Promise<PatientBrochureItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/patient-brochures`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load brochures');
  return data.patientBrochures ?? [];
}

export interface PatientEducationCategoryItem {
  id: string;
  name: string;
  folder: string;
}

export async function fetchPatientEducationCategories(): Promise<PatientEducationCategoryItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/patient-education`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load patient education');
  return data.patientEducationCategories ?? [];
}

export interface ProductQuickRefItem {
  id: string;
  name: string;
  category: string;
  description: string;
  sizes: string[];
  notes: string;
}

export async function fetchProductQuickRef(): Promise<ProductQuickRefItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load products');
  return data.productQuickRef ?? [];
}

export interface Monograph {
  id: string;
  name: string;
  description: string;
  fileName: string;
  photoFileName?: string;
}

export async function fetchMonographs(): Promise<Monograph[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/monographs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load clinical education materials');
  return data.monographs ?? [];
}

export async function uploadMonograph(formData: FormData): Promise<Monograph> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/monographs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function updateMonograph(id: string, formData: FormData): Promise<Monograph> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/monographs/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Update failed');
  return data;
}

export async function fetchEditableMaterials(feature: EditableMaterialFeature): Promise<EditableMaterialItem[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/editable/${feature}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load materials');
  return data.materials ?? [];
}

export async function uploadEditableMaterial(
  feature: EditableMaterialFeature,
  formData: FormData,
): Promise<EditableMaterialItem> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/editable/${feature}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.material;
}

export async function updateEditableMaterial(id: string, formData: FormData): Promise<EditableMaterialItem> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/editable/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Update failed');
  return data.material;
}

export async function deleteEditableMaterial(id: string): Promise<EditableMaterialItem> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/editable/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Delete failed');
  return data.material;
}

/** Fetches monograph cover image with Authorization; caller must revokeObjectURL when done */
export async function fetchMonographPhotoObjectUrl(monographId: string): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/materials/monograph-photo/${encodeURIComponent(monographId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Open PDF/image/etc. in a new tab using Bearer auth (avoids putting JWT in the URL) */
export async function openMaterialFileInNewTab(materialId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/materials/file/${encodeURIComponent(materialId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Failed to open file');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error('Popup blocked — allow popups for this site');
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export interface ProviderProfile {
  providerFirstName: string;
  providerLastName: string;
  title: string;
  company: string;
  providerEmail: string;
  directPhone: string;
  stateLicenseNumber: string;
  licenseExpiration: string;
  dea: string;
  npi: string;
  specialty: string;
  shippingStreetAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingZipCode: string;
  shippingEmail: string;
  shippingPhone: string;
  updatedAt: string;
}

export async function fetchProviderProfile(): Promise<ProviderProfile> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/provider-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load provider profile');
  return data.profile as ProviderProfile;
}

export interface AdminPartnerRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  role: PartnerRole;
  allowed_features: string[] | null;
  allowed_material_ids: string[] | null;
}

export interface MaterialCatalogGroup {
  feature: string;
  featureLabel: string;
  items: { id: string; label: string }[];
}

export async function fetchCurrentPartner(): Promise<{
  id: string;
  email: string;
  name: string;
  role: PartnerRole;
  allowedFeatures: string[];
} | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/partners/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const p = data.partner;
  if (!p?.id || !p.role || !Array.isArray(p.allowedFeatures)) return null;
  return p;
}

export async function fetchAdminMaterialCatalog(): Promise<MaterialCatalogGroup[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/material-catalog`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load material catalog');
  return data.catalog ?? [];
}

export async function fetchAdminPartners(): Promise<AdminPartnerRow[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/partners`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load partners');
  return data.partners ?? [];
}

export async function fetchAdminFeatureList(): Promise<{ key: string; label: string }[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/features`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load features');
  return data.features ?? [];
}

export async function patchAdminPartner(
  id: string,
  body: {
    role?: PartnerRole;
    allowed_features?: string[] | null;
    allowed_material_ids?: string[] | null;
  },
): Promise<AdminPartnerRow> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/partners/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Update failed');
  return data.partner as AdminPartnerRow;
}

export async function resetAdminPartnerPassword(id: string, password: string): Promise<AdminPartnerRow> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/partners/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Password reset failed');
  return data.partner as AdminPartnerRow;
}

export async function deleteAdminPartner(id: string): Promise<AdminPartnerRow> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/partners/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Delete account failed');
  return data.partner as AdminPartnerRow;
}

export async function createAdminPartner(body: {
  email: string;
  name: string;
  password: string;
  role: PartnerRole;
  allowed_features?: string[] | null;
  allowed_material_ids?: string[] | null;
}): Promise<AdminPartnerRow> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/admin/partners`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Create account failed');
  return data.partner as AdminPartnerRow;
}

export async function saveProviderProfile(
  patch: Omit<ProviderProfile, 'updatedAt'>,
): Promise<ProviderProfile> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/provider-profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save provider profile');
  return data.profile as ProviderProfile;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PARTNER_KEY);
}
