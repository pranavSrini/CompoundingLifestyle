import { loadMonographs } from './db/monographs.js';
import { listMaterialsByFeature } from './db/materialLibrary.js';
import type { FeatureKey } from './features.js';
import { FEATURE_LABELS } from './features.js';

export type CatalogGroup = {
  feature: FeatureKey;
  featureLabel: string;
  items: { id: string; label: string }[];
};

/** All downloadable / listable material ids grouped by feature (for admin UI + validation). */
export function getMaterialCatalog(): CatalogGroup[] {
  return [
    {
      feature: 'catalog_pricing',
      featureLabel: FEATURE_LABELS.catalog_pricing,
      items: listMaterialsByFeature('catalog_pricing').map((m) => ({ id: m.id, label: m.title })),
    },
    {
      feature: 'clinical_education',
      featureLabel: FEATURE_LABELS.clinical_education,
      items: loadMonographs().map((m) => ({ id: m.id, label: m.name })),
    },
    {
      feature: 'state_licenses',
      featureLabel: FEATURE_LABELS.state_licenses,
      items: listMaterialsByFeature('state_licenses').map((m) => ({ id: m.id, label: m.title })),
    },
    {
      feature: 'dosing',
      featureLabel: FEATURE_LABELS.dosing,
      items: listMaterialsByFeature('dosing').map((m) => ({ id: m.id, label: m.title })),
    },
    {
      feature: 'coas',
      featureLabel: FEATURE_LABELS.coas,
      items: listMaterialsByFeature('coas').map((m) => ({ id: m.id, label: m.title })),
    },
    {
      feature: 'patient_education',
      featureLabel: FEATURE_LABELS.patient_education,
      items: listMaterialsByFeature('patient_education').map((m) => ({ id: m.id, label: m.title })),
    },
    {
      feature: 'products',
      featureLabel: FEATURE_LABELS.products,
      items: [
        { id: 'p1', label: 'Tirzepatide' },
        { id: 'p2', label: 'Semaglutide' },
        { id: 'p3', label: 'Semaglutide + L-Carnitine' },
        { id: 'p4', label: 'Tirzepatide + B6' },
        { id: 'p5', label: 'NAD+' },
        { id: 'p6', label: 'Sermorelin' },
        { id: 'p7', label: 'Bremelanotide' },
        { id: 'p8', label: "Lipo-MIC / Myers' Cocktail" },
      ],
    },
  ];
}

export function getAllValidMaterialIds(): Set<string> {
  const s = new Set<string>();
  for (const g of getMaterialCatalog()) {
    for (const it of g.items) s.add(it.id);
  }
  return s;
}
