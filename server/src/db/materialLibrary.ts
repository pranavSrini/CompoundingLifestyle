import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import type { FeatureKey } from '../features.js';

const materialsPath = join(process.cwd(), 'data', 'materials.json');

export type EditableMaterialFeature =
  | 'catalog_pricing'
  | 'state_licenses'
  | 'dosing'
  | 'coas'
  | 'patient_education';

export interface EditableMaterialRecord {
  id: string;
  feature: EditableMaterialFeature;
  title: string;
  category: string;
  fileType: string;
  fileName: string;
  description?: string;
}

const FEATURE_PREFIX: Record<EditableMaterialFeature, string> = {
  catalog_pricing: 'mat-cat',
  state_licenses: 'mat-license',
  dosing: 'mat-dose',
  coas: 'mat-coa',
  patient_education: 'mat-pe',
};

export const DEFAULT_MATERIALS: EditableMaterialRecord[] = [
  {
    id: 'cat-2',
    feature: 'catalog_pricing',
    title: 'Spring 2026 Catalog',
    category: 'catalog',
    fileType: 'PDF',
    description: 'Current seasonal catalog',
    fileName: 'catalogs/Spring-2026.pdf',
  },
  {
    id: 'cat-6',
    feature: 'catalog_pricing',
    title: 'Peptides',
    category: 'catalog',
    fileType: 'PDF',
    description: 'Peptide catalog',
    fileName: 'catalogs/Peptides.pdf',
  },
  {
    id: 'price-1',
    feature: 'catalog_pricing',
    title: 'Volume Pricing Sheet Spring 2026',
    category: 'pricing',
    fileType: 'PDF',
    description: 'Volume pricing',
    fileName: 'pricing/Volume Pricing Sheet Spring 2026.pdf',
  },
  {
    id: 'price-2',
    feature: 'catalog_pricing',
    title: 'Product Descriptions',
    category: 'pricing',
    fileType: 'PDF',
    description: 'Product overview',
    fileName: 'pricing/Product Descriptions - Google Docs.pdf',
  },
  {
    id: 'price-3',
    feature: 'catalog_pricing',
    title: 'Product Blurbs',
    category: 'pricing',
    fileType: 'Excel',
    description: 'Product blurbs',
    fileName: 'pricing/Product Blurbs.xlsx',
  },
  { id: 'dose-1', feature: 'dosing', title: 'B6 Tirz Dosing Guide', category: 'dosing', fileType: 'PNG', fileName: 'dosing/B6 Tirz Dosing Guide.png' },
  { id: 'dose-2', feature: 'dosing', title: 'Semaglutide L-Carnitine Dosing', category: 'dosing', fileType: 'PNG', fileName: 'dosing/SemaglutideL-Carnitine Dosing Final.png' },
  { id: 'coa-1', feature: 'coas', title: 'Tirzepatide COA', category: 'coas', fileType: 'PDF', fileName: 'coas/Lifestyle Tirz COA.PDF' },
  { id: 'coa-2', feature: 'coas', title: 'Semaglutide COA', category: 'coas', fileType: 'PDF', fileName: 'coas/Lifestyle Sema COA.PDF' },
  { id: 'coa-3', feature: 'coas', title: 'Sema L-Carnitine COA', category: 'coas', fileType: 'PDF', fileName: 'coas/Sema_L-carnatine COA.PDF.pdf' },
  { id: 'coa-4', feature: 'coas', title: 'Tirz B6 Validation', category: 'coas', fileType: 'PDF', fileName: 'coas/Tirz B6 Validation of Formula.PDF' },
  { id: 'coa-5', feature: 'coas', title: 'Tirzepatide Analysis', category: 'coas', fileType: 'PDF', fileName: 'coas/Tirzepatide Analysis 06062025.pdf' },
  { id: 'license-ak', feature: 'state_licenses', title: 'Alaska', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Alaska.pdf' },
  { id: 'license-az', feature: 'state_licenses', title: 'Arizona', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Arizona.pdf' },
  { id: 'license-co', feature: 'state_licenses', title: 'Colorado', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Colorado.pdf' },
  { id: 'license-ct', feature: 'state_licenses', title: 'Connecticut', category: 'state-licenses', fileType: 'PNG', description: 'Board verification', fileName: 'state-licenses/Connecticut.png' },
  { id: 'license-de', feature: 'state_licenses', title: 'Delaware', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Delaware.pdf' },
  { id: 'license-fl', feature: 'state_licenses', title: 'Florida', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Florida.pdf' },
  { id: 'license-hi', feature: 'state_licenses', title: 'Hawaii', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Hawaii.pdf' },
  { id: 'license-id', feature: 'state_licenses', title: 'Idaho', category: 'state-licenses', fileType: 'PNG', description: 'Board verification', fileName: 'state-licenses/Idaho.png' },
  { id: 'license-il', feature: 'state_licenses', title: 'Illinois', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Illinois.pdf' },
  { id: 'license-me', feature: 'state_licenses', title: 'Maine', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Maine.pdf' },
  { id: 'license-nh', feature: 'state_licenses', title: 'New Hampshire', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/New-Hampshire.pdf' },
  { id: 'license-nm', feature: 'state_licenses', title: 'New Mexico', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/New-Mexico.pdf' },
  { id: 'license-ny', feature: 'state_licenses', title: 'New York', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/New-York.pdf' },
  { id: 'license-oh', feature: 'state_licenses', title: 'Ohio', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Ohio.pdf' },
  { id: 'license-ri', feature: 'state_licenses', title: 'Rhode Island', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Rhode-Island.pdf' },
  { id: 'license-ut', feature: 'state_licenses', title: 'Utah', category: 'state-licenses', fileType: 'PNG', description: 'Board verification', fileName: 'state-licenses/Utah.png' },
  { id: 'license-wi', feature: 'state_licenses', title: 'Wisconsin', category: 'state-licenses', fileType: 'PNG', description: 'Board verification', fileName: 'state-licenses/Wisconsin.png' },
  { id: 'license-wy', feature: 'state_licenses', title: 'Wyoming', category: 'state-licenses', fileType: 'PDF', description: 'Board verification', fileName: 'state-licenses/Wyoming.pdf' },
  { id: 'brochure-1', feature: 'patient_education', title: 'GHK-Cu Brochure', category: 'brochures', fileType: 'PDF', description: 'Copper peptide topical cream - patient overview', fileName: 'GHK-Cu-Brochure.pdf' },
  { id: 'brochure-2', feature: 'patient_education', title: 'Patient NAD Brochure', category: 'brochures', fileType: 'PDF', description: 'NAD+ cellular energy & anti-aging - patient overview', fileName: 'Patient-NAD-Brochure.pdf' },
  { id: 'pe-1', feature: 'patient_education', title: 'GLP-1 / GIP Differences', category: 'GLP1-GIP Differences', fileType: 'PNG', fileName: 'pamphlets/GLP1-GIP-1.png' },
  { id: 'pe-2', feature: 'patient_education', title: 'Semaglutide', category: 'Semaglutide', fileType: 'PNG', fileName: 'pamphlets/Semaglutide-1.png' },
  { id: 'pe-3', feature: 'patient_education', title: 'Tirzepatide', category: 'Tirzepatide', fileType: 'PNG', fileName: 'pamphlets/Tirzepatide-1.png' },
  { id: 'pe-4', feature: 'patient_education', title: 'Dulaglutide', category: 'Dulaglutide', fileType: 'PNG', fileName: 'pamphlets/Dulaglutide-1.png' },
  { id: 'pe-5', feature: 'patient_education', title: 'Male HRT', category: 'Male HRT', fileType: 'PNG', fileName: 'pamphlets/Male-HRT-1.png' },
  { id: 'pe-6', feature: 'patient_education', title: 'Female HRT', category: 'Female HRT', fileType: 'PNG', fileName: 'pamphlets/Female-HRT-1.png' },
  { id: 'pe-7', feature: 'patient_education', title: 'Sexual Health', category: 'Sexual Health', fileType: 'PNG', fileName: 'pamphlets/Sexual-Health-1.png' },
  { id: 'pe-8', feature: 'patient_education', title: 'B12 Shots vs Lipo-MIC', category: 'B12 Shots vs. Lipo-MIC-B12_Shots', fileType: 'PNG', fileName: 'pamphlets/B12-LipoMIC-1.png' },
  { id: 'pe-9', feature: 'patient_education', title: 'MIC Lipotropic Injections', category: 'MIC Lipotropic Injections', fileType: 'PNG', fileName: 'pamphlets/MIC-Lipotropic-1.png' },
  { id: 'pe-10', feature: 'patient_education', title: 'Infusion Pamphlet', category: 'Infusion Pamphlet', fileType: 'JPG', fileName: 'pamphlets/Infusion-1.jpg' },
  { id: 'pe-11', feature: 'patient_education', title: 'Med Fact Sheets', category: 'Med Fact Sheets', fileType: 'PDF', fileName: 'pamphlets/Med-Fact-Sheets-1.pdf' },
];

function ensureDir() {
  const dir = dirname(materialsPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function saveMaterials(items: EditableMaterialRecord[]) {
  ensureDir();
  writeFileSync(materialsPath, JSON.stringify(items, null, 2), 'utf-8');
}

export function loadEditableMaterials(): EditableMaterialRecord[] {
  ensureDir();
  if (!existsSync(materialsPath)) return [...DEFAULT_MATERIALS];
  try {
    const raw = readFileSync(materialsPath, 'utf-8');
    const data = JSON.parse(raw) as EditableMaterialRecord[];
    return Array.isArray(data) ? data : [...DEFAULT_MATERIALS];
  } catch {
    return [...DEFAULT_MATERIALS];
  }
}

export function listMaterialsByFeature(feature: EditableMaterialFeature): EditableMaterialRecord[] {
  return loadEditableMaterials().filter((item) => item.feature === feature);
}

export function getEditableMaterialById(id: string): EditableMaterialRecord | undefined {
  return loadEditableMaterials().find((item) => item.id === id);
}

export function isEditableMaterialFeature(feature: string): feature is EditableMaterialFeature {
  return ['catalog_pricing', 'state_licenses', 'dosing', 'coas', 'patient_education'].includes(feature);
}

export function getEditableFeatureForMaterialId(materialId: string): FeatureKey | null {
  const found = getEditableMaterialById(materialId);
  return found?.feature ?? null;
}

export function getEditableMaterialFileMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of loadEditableMaterials()) out[item.id] = item.fileName;
  return out;
}

export function nextMaterialId(feature: EditableMaterialFeature): string {
  const prefix = FEATURE_PREFIX[feature];
  const nums = loadEditableMaterials()
    .map((item) => {
      const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${max + 1}`;
}

export function addEditableMaterial(input: Omit<EditableMaterialRecord, 'id'>): EditableMaterialRecord {
  const items = loadEditableMaterials();
  const material: EditableMaterialRecord = { id: nextMaterialId(input.feature), ...input };
  items.push(material);
  saveMaterials(items);
  return material;
}

export function updateEditableMaterial(
  id: string,
  updates: Partial<Omit<EditableMaterialRecord, 'id' | 'feature'>>,
): EditableMaterialRecord | null {
  const items = loadEditableMaterials();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...updates };
  saveMaterials(items);
  return items[idx];
}

export function deleteEditableMaterial(id: string): EditableMaterialRecord | null {
  const items = loadEditableMaterials();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  const [deleted] = items.splice(idx, 1);
  saveMaterials(items);
  return deleted;
}
