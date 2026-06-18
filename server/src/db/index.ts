import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ALL_FEATURES, type FeatureKey, isValidFeatureKey } from '../features.js';
import { getAllValidMaterialIds } from '../materialCatalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(process.cwd(), 'data', 'store.json');

export type Role = 'admin' | 'provider' | 'sales_rep';

interface Partner {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  role?: Role;
  /** null/undefined = all features. Empty array = no optional features (dashboard only). */
  allowed_features?: string[] | null;
  /** null/undefined = all downloadable materials (within allowed features). Non-null = allow-list of material ids. */
  allowed_material_ids?: string[] | null;
}

interface Store {
  partners: Partner[];
  material_access: { partner_id: string; material_id: string }[];
}

function ensureDir() {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function migrateStore(store: Store): boolean {
  let changed = false;
  for (const p of store.partners) {
    if (p.role === undefined) {
      p.role = 'provider';
      changed = true;
    }
    if (p.allowed_material_ids === undefined) {
      const legacy = store.material_access.filter((x) => x.partner_id === p.id).map((x) => x.material_id);
      p.allowed_material_ids = legacy.length > 0 ? [...new Set(legacy)] : null;
      changed = true;
    }
  }
  if (store.material_access.length > 0) {
    store.material_access = [];
    changed = true;
  }
  return changed;
}

function load(): Store {
  ensureDir();
  if (!existsSync(dbPath)) {
    return { partners: [], material_access: [] };
  }
  const raw = readFileSync(dbPath, 'utf-8');
  const store = JSON.parse(raw) as Store;
  if (migrateStore(store)) {
    save(store);
  }
  return store;
}

function save(store: Store) {
  ensureDir();
  writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf-8');
}

export interface PartnerPublic {
  id: string;
  email: string;
  name: string;
  created_at: string;
  role: Role;
  /** Effective feature keys this user may use (for UI). Admins always get the full list. */
  allowedFeatures: FeatureKey[];
}

export interface PartnerAdminRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  role: Role;
  allowed_features: string[] | null;
  allowed_material_ids: string[] | null;
}

export function normalizeRole(p: Partner): Role {
  return p.role ?? 'provider';
}

export function getEffectiveFeatures(p: Partner): FeatureKey[] {
  const role = normalizeRole(p);
  if (role === 'admin') return [...ALL_FEATURES];
  if (p.allowed_features == null) return [...ALL_FEATURES];
  return p.allowed_features.filter((x): x is FeatureKey => isValidFeatureKey(x));
}

export function hasFeature(partnerId: string, feature: FeatureKey): boolean {
  const store = load();
  const p = store.partners.find((x) => x.id === partnerId);
  if (!p) return false;
  return getEffectiveFeatures(p).includes(feature);
}

export function isAdmin(partnerId: string): boolean {
  const store = load();
  const p = store.partners.find((x) => x.id === partnerId);
  return p ? normalizeRole(p) === 'admin' : false;
}

export function getPartnerByEmail(email: string): (PartnerPublic & { password_hash: string }) | undefined {
  const store = load();
  const p = store.partners.find((x) => x.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!p) return undefined;
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    password_hash: p.password_hash,
    role: normalizeRole(p),
    allowedFeatures: getEffectiveFeatures(p),
  };
}

export function getPartnerById(id: string): PartnerPublic | undefined {
  const store = load();
  const p = store.partners.find((x) => x.id === id);
  if (!p) return undefined;
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    role: normalizeRole(p),
    allowedFeatures: getEffectiveFeatures(p),
  };
}

export function getPartnerRecord(id: string): Partner | undefined {
  const store = load();
  return store.partners.find((x) => x.id === id);
}

const ROLES: Role[] = ['admin', 'provider', 'sales_rep'];

export function createPartner(
  id: string,
  email: string,
  name: string,
  passwordHash: string,
  role: Role = 'provider',
  allowed_features: string[] | null = null,
  allowed_material_ids: string[] | null = null,
): PartnerPublic {
  if (!ROLES.includes(role)) {
    throw new Error('Invalid role');
  }
  const store = load();
  if (store.partners.some((x) => x.email.toLowerCase() === email.toLowerCase().trim())) {
    throw new Error('Partner with this email already exists');
  }
  const partner: Partner = {
    id,
    email: email.toLowerCase().trim(),
    name,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
    role,
    allowed_features,
    allowed_material_ids,
  };
  store.partners.push(partner);
  save(store);
  return {
    id: partner.id,
    email: partner.email,
    name: partner.name,
    created_at: partner.created_at,
    role: normalizeRole(partner),
    allowedFeatures: getEffectiveFeatures(partner),
  };
}

export function listPartnersForAdmin(): PartnerAdminRow[] {
  const store = load();
  return store.partners.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    role: normalizeRole(p),
    allowed_features: p.allowed_features == null ? null : [...p.allowed_features],
    allowed_material_ids:
      p.allowed_material_ids == null ? null : [...p.allowed_material_ids],
  }));
}

export function updatePartnerAccess(
  id: string,
  updates: {
    role?: Role;
    allowed_features?: string[] | null;
    allowed_material_ids?: string[] | null;
  },
): PartnerAdminRow | null {
  const store = load();
  const idx = store.partners.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const p = store.partners[idx];
  if (updates.role !== undefined) {
    if (!['admin', 'provider', 'sales_rep'].includes(updates.role)) return null;
    p.role = updates.role;
  }
  if (updates.allowed_features !== undefined) {
    if (updates.allowed_features === null) {
      p.allowed_features = null;
    } else {
      const cleaned = updates.allowed_features.filter((k) => isValidFeatureKey(k));
      p.allowed_features = cleaned;
    }
  }
  if (updates.allowed_material_ids !== undefined) {
    if (updates.allowed_material_ids === null) {
      p.allowed_material_ids = null;
    } else {
      const valid = getAllValidMaterialIds();
      p.allowed_material_ids = [...new Set(updates.allowed_material_ids.filter((mid) => valid.has(mid)))];
    }
  }
  if (normalizeRole(p) === 'admin') {
    p.allowed_features = null;
    p.allowed_material_ids = null;
  }
  save(store);
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    role: normalizeRole(p),
    allowed_features: p.allowed_features == null ? null : [...p.allowed_features],
    allowed_material_ids:
      p.allowed_material_ids == null ? null : [...p.allowed_material_ids],
  };
}

export function updatePartnerPassword(id: string, passwordHash: string): PartnerAdminRow | null {
  const store = load();
  const p = store.partners.find((x) => x.id === id);
  if (!p) return null;
  p.password_hash = passwordHash;
  save(store);
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    role: normalizeRole(p),
    allowed_features: p.allowed_features == null ? null : [...p.allowed_features],
    allowed_material_ids:
      p.allowed_material_ids == null ? null : [...p.allowed_material_ids],
  };
}

export function deletePartner(id: string): PartnerAdminRow | null {
  const store = load();
  const idx = store.partners.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const [p] = store.partners.splice(idx, 1);
  store.material_access = store.material_access.filter((x) => x.partner_id !== id);
  save(store);
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    created_at: p.created_at,
    role: normalizeRole(p),
    allowed_features: p.allowed_features == null ? null : [...p.allowed_features],
    allowed_material_ids:
      p.allowed_material_ids == null ? null : [...p.allowed_material_ids],
  };
}

export function hasAccessToMaterial(partnerId: string, materialId: string): boolean {
  const p = getPartnerRecord(partnerId);
  if (!p) return false;
  const ids = p.allowed_material_ids;
  if (ids == null) return true;
  return ids.includes(materialId);
}

export function countPartners(): number {
  return load().partners.length;
}

export function initDb(): void {}

export async function seedIfEmpty(): Promise<void> {
  const bcrypt = await import('bcryptjs');
  const { config } = await import('../config.js');
  const { randomUUID } = await import('crypto');
  if (countPartners() > 0) return;
  const hash = await bcrypt.default.hash('partner123', config.bcryptRounds);
  createPartner(randomUUID(), 'admin@lifestyle.test', 'Test Admin', hash, 'admin', null, null);
  createPartner(randomUUID(), 'provider@lifestyle.test', 'Test Provider', hash, 'provider', null, null);
  createPartner(
    randomUUID(),
    'sales@lifestyle.test',
    'Test Sales Rep',
    hash,
    'sales_rep',
    ['catalog_pricing', 'clinical_education', 'products', 'dosing', 'patient_education'],
    null,
  );
  console.log(
    'Seeded test accounts (password partner123): admin@lifestyle.test, provider@lifestyle.test, sales@lifestyle.test',
  );
}
