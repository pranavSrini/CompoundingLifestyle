import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(process.cwd(), 'data', 'provider_profiles.json');

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

export const EMPTY_PROFILE: Omit<ProviderProfile, 'updatedAt'> = {
  providerFirstName: '',
  providerLastName: '',
  title: '',
  company: '',
  providerEmail: '',
  directPhone: '',
  stateLicenseNumber: '',
  licenseExpiration: '',
  dea: '',
  npi: '',
  specialty: '',
  shippingStreetAddress: '',
  shippingCity: '',
  shippingState: '',
  shippingCountry: '',
  shippingZipCode: '',
  shippingEmail: '',
  shippingPhone: '',
};

type Store = Record<string, ProviderProfile>;

function ensureDir() {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadStore(): Store {
  ensureDir();
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Store;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  ensureDir();
  writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

function mergeWithDefaults(raw: Partial<ProviderProfile> | undefined): ProviderProfile {
  const base: ProviderProfile = {
    ...EMPTY_PROFILE,
    updatedAt: '',
  };
  if (!raw || typeof raw !== 'object') return base;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    providerFirstName: str(raw.providerFirstName),
    providerLastName: str(raw.providerLastName),
    title: str(raw.title),
    company: str(raw.company),
    providerEmail: str(raw.providerEmail),
    directPhone: str(raw.directPhone),
    stateLicenseNumber: str(raw.stateLicenseNumber),
    licenseExpiration: str(raw.licenseExpiration),
    dea: str(raw.dea),
    npi: str(raw.npi),
    specialty: str(raw.specialty),
    shippingStreetAddress: str(raw.shippingStreetAddress),
    shippingCity: str(raw.shippingCity),
    shippingState: str(raw.shippingState),
    shippingCountry: str(raw.shippingCountry),
    shippingZipCode: str(raw.shippingZipCode),
    shippingEmail: str(raw.shippingEmail),
    shippingPhone: str(raw.shippingPhone),
    updatedAt: str(raw.updatedAt),
  };
}

export function getProviderProfile(partnerId: string): ProviderProfile {
  const store = loadStore();
  return mergeWithDefaults(store[partnerId]);
}

export function upsertProviderProfile(partnerId: string, input: Partial<ProviderProfile>): ProviderProfile {
  const store = loadStore();
  const prev = mergeWithDefaults(store[partnerId]);
  const merged = mergeWithDefaults({ ...prev, ...input });
  merged.updatedAt = new Date().toISOString();
  store[partnerId] = merged;
  saveStore(store);
  return merged;
}

export function deleteProviderProfile(partnerId: string): void {
  const store = loadStore();
  if (store[partnerId]) {
    delete store[partnerId];
    saveStore(store);
  }
}
