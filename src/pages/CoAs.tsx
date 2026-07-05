import EditableMaterialManager from '../components/EditableMaterialManager';

export default function CoAs() {
  return (
    <EditableMaterialManager
      feature="coas"
      title="Certificates of Analysis"
      subtitle="CoAs and validation documents for quality assurance."
      emptyText="No CoAs are enabled for your account."
      uploadTitle="Upload CoA"
      categoryPlaceholder="coas"
      defaultCategory="coas"
    />
  );
}
