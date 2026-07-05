import EditableMaterialManager from '../components/EditableMaterialManager';

export default function PatientEducation() {
  return (
    <EditableMaterialManager
      feature="patient_education"
      title="Patient Education"
      subtitle="Pamphlets and fact sheets to share with patients. Organized by topic."
      emptyText="No patient education materials are enabled for your account."
      uploadTitle="Upload patient education material"
      categoryPlaceholder="brochures, Semaglutide, Male HRT, etc."
      defaultCategory="brochures"
    />
  );
}
