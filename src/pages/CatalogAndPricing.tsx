import EditableMaterialManager from '../components/EditableMaterialManager';

export default function CatalogAndPricing() {
  return (
    <EditableMaterialManager
      feature="catalog_pricing"
      title="Catalog & Pricing"
      subtitle="Current product catalog, peptides catalog, and pricing materials. Share with customers during screen calls."
      emptyText="No catalog or pricing files are enabled for your account."
      uploadTitle="Upload catalog or pricing file"
      categoryPlaceholder="catalog or pricing"
      defaultCategory="pricing"
    />
  );
}
