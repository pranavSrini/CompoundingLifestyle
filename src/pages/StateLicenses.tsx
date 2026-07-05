import EditableMaterialManager from '../components/EditableMaterialManager';

export default function StateLicenses() {
  return (
    <EditableMaterialManager
      feature="state_licenses"
      title="State Licenses"
      subtitle="Board verification and license documents by state. Use during credentialing or when partners ask for proof of licensure."
      emptyText="No state license documents are enabled for your account."
      uploadTitle="Upload state license"
      categoryPlaceholder="state-licenses"
      defaultCategory="state-licenses"
    />
  );
}
