import EditableMaterialManager from '../components/EditableMaterialManager';

export default function Dosing() {
  return (
    <EditableMaterialManager
      feature="dosing"
      title="Dosing Guides"
      subtitle="Dosing schedules and administration guidelines for key products."
      emptyText="No dosing guides are enabled for your account."
      uploadTitle="Upload dosing guide"
      categoryPlaceholder="dosing"
      defaultCategory="dosing"
    />
  );
}
