import { Router, Request, Response } from 'express';
import path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { hasAccessToMaterial, hasFeature } from '../db/index.js';
import { requireFeature, requireAdmin } from '../middleware/requireFeature.js';
import { getFeatureForMaterialId } from '../features.js';
import {
  loadMonographs,
  addMonograph,
  updateMonograph,
} from '../db/monographs.js';
import {
  addEditableMaterial,
  deleteEditableMaterial,
  getEditableFeatureForMaterialId,
  getEditableMaterialById,
  getEditableMaterialFileMap,
  isEditableMaterialFeature,
  listMaterialsByFeature,
  updateEditableMaterial,
  type EditableMaterialFeature,
} from '../db/materialLibrary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Materials live in server/materials/ (brochures + catalogs/ subfolder)
const materialsPath = path.resolve(process.cwd(), 'materials');
const monographsDir = path.join(materialsPath, 'monographs');

function getMonographFiles(): Record<string, string> {
  const items = loadMonographs();
  const out: Record<string, string> = {};
  for (const m of items) {
    out[m.id] = `monographs/${m.fileName}`;
  }
  return out;
}

const monographPhotosDir = path.join(monographsDir, 'photos');

function monographPhotoAbsPath(photoFileName: string): string {
  return path.join(monographPhotosDir, photoFileName);
}

function safeUnlinkMonographPhoto(photoFileName: string | undefined): void {
  if (!photoFileName) return;
  const p = monographPhotoAbsPath(photoFileName);
  if (existsSync(p)) unlinkSync(p);
}

const productQuickRef = [
  { id: 'p1', name: 'Tirzepatide', category: 'GLP-1/GIP', description: 'Dual agonist for weight management and glycemic control', sizes: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'], notes: 'See dosing guide for escalation' },
  { id: 'p2', name: 'Semaglutide', category: 'GLP-1', description: 'GLP-1 agonist for weight loss and diabetes', sizes: ['0.25mg', '0.5mg', '1mg', '2.4mg'], notes: 'Weekly injection' },
  { id: 'p3', name: 'Semaglutide + L-Carnitine', category: 'GLP-1 + Amino Acid', description: 'Combination for enhanced metabolic support', sizes: ['5mL', '10mL'], notes: 'See dosing guide' },
  { id: 'p4', name: 'Tirzepatide + B6', category: 'GLP-1/GIP + Vitamin', description: 'Tirzepatide with B6 for reduced nausea', sizes: ['As per Tirzepatide'], notes: 'Validation available' },
  { id: 'p5', name: 'NAD+', category: 'Peptide', description: 'Cellular energy, anti-aging, recovery', sizes: ['IV/IM formulations'], notes: 'See monograph' },
  { id: 'p6', name: 'Sermorelin', category: 'Peptide', description: 'Growth hormone support', sizes: ['Standard vial sizes'], notes: 'See monograph' },
  { id: 'p7', name: 'Bremelanotide', category: 'Peptide', description: 'Sexual health support', sizes: ['As prescribed'], notes: 'See monograph' },
  { id: 'p8', name: "Lipo-MIC / Myers' Cocktail", category: 'Injectables / Infusions', description: 'Lipotropic and IV nutrient formulations', sizes: ['Various'], notes: 'See dosing and monographs' },
];

function filterByAccess<T extends { id: string }>(items: T[], partnerId: string): T[] {
  return items.filter((item) => hasAccessToMaterial(partnerId, item.id));
}

const router = Router();

type ReqFiles = Record<string, Express.Multer.File[] | undefined>;
function getUploadedFile(files: ReqFiles | undefined, field: string): Express.Multer.File | undefined {
  return files?.[field]?.[0];
}

function truthyRemovePhoto(body: Record<string, unknown>): boolean {
  const v = body.removePhoto;
  return v === true || v === 'true' || v === '1' || v === 'on';
}

// Multer: monograph document (PDF/DOCX) + optional cover photo (images)
const monographStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isPhoto = file.fieldname === 'photo';
    const dir = isPhoto ? monographPhotosDir : monographsDir;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe =
      Buffer.from(file.originalname, 'latin1')
        .toString('utf-8')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_')
        .trim() || (file.fieldname === 'photo' ? 'cover' : 'monograph');
    const ext = path.extname(file.originalname) || (file.fieldname === 'photo' ? '.jpg' : '.pdf');
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const prefix = file.fieldname === 'photo' ? 'cover_' : '';
    cb(null, `${prefix}${stamp}_${safe}${ext}`);
  },
});
const uploadMonograph = multer({
  storage: monographStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (file.fieldname === 'photo') {
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) cb(null, true);
      else cb(new Error('Cover photo must be JPG, PNG, GIF, or WebP'));
    } else if (file.fieldname === 'file') {
      if (['.pdf', '.docx'].includes(ext)) cb(null, true);
      else cb(new Error('Only PDF and DOCX files are allowed for the document'));
    } else cb(new Error('Unexpected field'));
  },
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

function fileTypeFromName(fileName: string): string {
  const ext = (path.extname(fileName) || '').slice(1).toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx') return 'Word';
  if (ext === 'xlsx') return 'Excel';
  return ext.toUpperCase() || 'File';
}

function materialSubdir(feature: EditableMaterialFeature, category?: string): string {
  if (feature === 'catalog_pricing') return category === 'catalog' ? 'catalogs' : 'pricing';
  if (feature === 'state_licenses') return 'state-licenses';
  if (feature === 'dosing') return 'dosing';
  if (feature === 'coas') return 'coas';
  return category === 'brochures' ? '' : 'pamphlets';
}

function materialUploadFeature(req: Request): EditableMaterialFeature | null {
  const raw = req.params.feature;
  if (raw && isEditableMaterialFeature(raw)) return raw;
  const existing = req.params.id ? getEditableMaterialById(req.params.id) : undefined;
  return existing?.feature ?? null;
}

function sanitizeUploadName(originalName: string): string {
  const parsed = path.parse(originalName);
  const base =
    Buffer.from(parsed.name, 'latin1')
      .toString('utf-8')
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '_')
      .trim() || 'material';
  const ext = parsed.ext || '.pdf';
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return `${stamp}_${base}${ext}`;
}

const editableMaterialStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const feature = materialUploadFeature(req);
    if (!feature) return cb(new Error('Invalid material section'), materialsPath);
    const category = (req.body.category as string | undefined)?.trim();
    const dir = path.join(materialsPath, materialSubdir(feature, category));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, sanitizeUploadName(file.originalname)),
});

const uploadEditableMaterial = multer({
  storage: editableMaterialStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Supported files: PDF, DOCX, XLSX, PNG, JPG, GIF, or WebP'));
  },
}).single('file');

function relativeMaterialPath(file: Express.Multer.File): string {
  return path.relative(materialsPath, file.path).replace(/\\/g, '/');
}

function safeUnlinkMaterial(relativePath: string | undefined): void {
  if (!relativePath) return;
  const abs = path.resolve(materialsPath, relativePath);
  if (!abs.startsWith(materialsPath)) return;
  if (existsSync(abs)) unlinkSync(abs);
}

router.get('/catalog-and-pricing', requireAuth, requireFeature('catalog_pricing'), (req: Request, res: Response) => {
  const filtered = filterByAccess(listMaterialsByFeature('catalog_pricing'), req.partnerId!);
  res.json({ catalogAndPricing: filtered });
});

router.get('/monographs', requireAuth, requireFeature('clinical_education'), (req: Request, res: Response) => {
  const monographs = loadMonographs();
  const filtered = filterByAccess(monographs, req.partnerId!);
  res.json({ monographs: filtered });
});

router.post('/monographs', requireAuth, requireAdmin, uploadMonograph, (req: Request, res: Response) => {
  try {
    const files = (req as Request & { files?: ReqFiles }).files;
    const docFile = getUploadedFile(files, 'file');
    const photoFile = getUploadedFile(files, 'photo');
    const name = (req.body.name as string)?.trim();
    const description = (req.body.description as string)?.trim() || '';
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!docFile) return res.status(400).json({ error: 'Document file is required' });
    const monograph = addMonograph(name, description, docFile.filename, photoFile?.filename);
    res.status(201).json(monograph);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(400).json({ error: msg });
  }
});

router.put('/monographs/:id', requireAuth, requireAdmin, uploadMonograph, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = loadMonographs().find((m) => m.id === id);
    if (!existing) return res.status(404).json({ error: 'Monograph not found' });

    const files = (req as Request & { files?: ReqFiles }).files;
    const docFile = getUploadedFile(files, 'file');
    const photoFile = getUploadedFile(files, 'photo');
    const name = (req.body.name as string)?.trim();
    const description = (req.body.description as string)?.trim();
    const removePhoto = truthyRemovePhoto(req.body as Record<string, unknown>);

    const updates: {
      name?: string;
      description?: string;
      fileName?: string;
      photoFileName?: string | null;
    } = {};
    if (name !== undefined && name !== '') updates.name = name;
    if (description !== undefined) updates.description = description;
    if (docFile) updates.fileName = docFile.filename;
    if (photoFile) {
      updates.photoFileName = photoFile.filename;
      safeUnlinkMonographPhoto(existing.photoFileName);
    } else if (removePhoto) {
      updates.photoFileName = null;
      safeUnlinkMonographPhoto(existing.photoFileName);
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });
    const monograph = updateMonograph(id, updates);
    if (!monograph) return res.status(404).json({ error: 'Monograph not found' });
    res.json(monograph);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: msg });
  }
});

router.get('/monograph-photo/:id', requireAuth, requireFeature('clinical_education'), (req: Request, res: Response) => {
  const monographs = loadMonographs();
  const m = monographs.find((x) => x.id === req.params.id);
  if (!m?.photoFileName) return res.status(404).json({ error: 'No photo' });
  if (!hasAccessToMaterial(req.partnerId!, m.id)) return res.status(403).json({ error: 'Access denied' });
  const abs = monographPhotoAbsPath(m.photoFileName);
  if (!existsSync(abs)) return res.status(404).json({ error: 'Photo file missing' });
  res.sendFile(abs);
});

router.get('/dosing', requireAuth, requireFeature('dosing'), (req: Request, res: Response) => {
  const filtered = filterByAccess(listMaterialsByFeature('dosing'), req.partnerId!);
  res.json({ dosingGuides: filtered });
});

router.get('/coas', requireAuth, requireFeature('coas'), (req: Request, res: Response) => {
  const filtered = filterByAccess(listMaterialsByFeature('coas'), req.partnerId!);
  res.json({ coas: filtered });
});

router.get('/state-licenses', requireAuth, requireFeature('state_licenses'), (req: Request, res: Response) => {
  const filtered = filterByAccess(listMaterialsByFeature('state_licenses'), req.partnerId!);
  res.json({ stateLicenses: filtered });
});

router.get('/patient-brochures', requireAuth, requireFeature('patient_education'), (req: Request, res: Response) => {
  const filtered = filterByAccess(
    listMaterialsByFeature('patient_education')
      .filter((item) => item.category === 'brochures')
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? '',
        filePath: `/api/materials/file/${item.id}`,
      })),
    req.partnerId!,
  );
  res.json({ patientBrochures: filtered });
});

router.get('/editable/:feature', requireAuth, (req: Request, res: Response) => {
  const feature = req.params.feature;
  if (!isEditableMaterialFeature(feature)) return res.status(400).json({ error: 'Invalid material section' });
  if (!hasFeature(req.partnerId!, feature)) return res.status(403).json({ error: 'Access denied' });
  const materials = filterByAccess(listMaterialsByFeature(feature), req.partnerId!);
  res.json({ materials });
});

router.post('/editable/:feature', requireAuth, requireAdmin, uploadEditableMaterial, (req: Request, res: Response) => {
  try {
    const feature = req.params.feature;
    if (!isEditableMaterialFeature(feature)) return res.status(400).json({ error: 'Invalid material section' });
    const file = req.file;
    const title = (req.body.title as string | undefined)?.trim();
    const category = (req.body.category as string | undefined)?.trim() || materialSubdir(feature);
    const description = (req.body.description as string | undefined)?.trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!file) return res.status(400).json({ error: 'File is required' });

    const material = addEditableMaterial({
      feature,
      title,
      category,
      description,
      fileName: relativeMaterialPath(file),
      fileType: fileTypeFromName(file.originalname),
    });
    res.status(201).json({ material });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(400).json({ error: msg });
  }
});

router.put('/editable/:id', requireAuth, requireAdmin, uploadEditableMaterial, (req: Request, res: Response) => {
  try {
    const existing = getEditableMaterialById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Material not found' });

    const file = req.file;
    const title = (req.body.title as string | undefined)?.trim();
    const category = (req.body.category as string | undefined)?.trim();
    const description = (req.body.description as string | undefined)?.trim();
    const updates: Parameters<typeof updateEditableMaterial>[1] = {};

    if (title) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (file) {
      updates.fileName = relativeMaterialPath(file);
      updates.fileType = fileTypeFromName(file.originalname);
      safeUnlinkMaterial(existing.fileName);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });

    const material = updateEditableMaterial(req.params.id, updates);
    res.json({ material });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: msg });
  }
});

router.delete('/editable/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const deleted = deleteEditableMaterial(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Material not found' });
  safeUnlinkMaterial(deleted.fileName);
  res.json({ material: deleted });
});

// Serve all materials (Authorization: Bearer; optional ?token= only if ALLOW_AUTH_QUERY_TOKEN=true)
router.get('/file/:id', requireAuth, (req: Request, res: Response) => {
  const feat = getEditableFeatureForMaterialId(req.params.id) ?? getFeatureForMaterialId(req.params.id);
  if (feat && !hasFeature(req.partnerId!, feat)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const monographFiles = getMonographFiles();
  const editableFiles = getEditableMaterialFileMap();
  const filename =
    editableFiles[req.params.id] ??
    monographFiles[req.params.id] ??
    undefined;
  if (!filename) return res.status(404).json({ error: 'File not found' });
  if (!hasAccessToMaterial(req.partnerId!, req.params.id)) return res.status(403).json({ error: 'Access denied' });
  res.sendFile(path.join(materialsPath, filename));
});

router.get('/patient-education', requireAuth, requireFeature('patient_education'), (req: Request, res: Response) => {
  const filtered = filterByAccess(
    listMaterialsByFeature('patient_education')
      .filter((item) => item.category !== 'brochures')
      .map((item) => ({ id: item.id, name: item.title, folder: item.category })),
    req.partnerId!,
  );
  res.json({ patientEducationCategories: filtered });
});

router.get('/products', requireAuth, requireFeature('products'), (req: Request, res: Response) => {
  const filtered = filterByAccess(productQuickRef, req.partnerId!);
  res.json({ productQuickRef: filtered });
});

// All materials in one response for dashboard
router.get('/all', requireAuth, (req: Request, res: Response) => {
  const partnerId = req.partnerId!;
  const monographs = loadMonographs();
  res.json({
    catalogAndPricing: hasFeature(partnerId, 'catalog_pricing')
      ? filterByAccess(listMaterialsByFeature('catalog_pricing'), partnerId)
      : [],
    monographs: hasFeature(partnerId, 'clinical_education')
      ? filterByAccess(monographs, partnerId)
      : [],
    dosingGuides: hasFeature(partnerId, 'dosing') ? filterByAccess(listMaterialsByFeature('dosing'), partnerId) : [],
    coas: hasFeature(partnerId, 'coas') ? filterByAccess(listMaterialsByFeature('coas'), partnerId) : [],
    patientBrochures: hasFeature(partnerId, 'patient_education')
      ? filterByAccess(
        listMaterialsByFeature('patient_education')
          .filter((item) => item.category === 'brochures')
          .map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? '',
            filePath: `/api/materials/file/${item.id}`,
          })),
        partnerId,
      )
      : [],
    patientEducationCategories: hasFeature(partnerId, 'patient_education')
      ? filterByAccess(
        listMaterialsByFeature('patient_education')
          .filter((item) => item.category !== 'brochures')
          .map((item) => ({ id: item.id, name: item.title, folder: item.category })),
        partnerId,
      )
      : [],
    productQuickRef: hasFeature(partnerId, 'products') ? filterByAccess(productQuickRef, partnerId) : [],
    stateLicenses: hasFeature(partnerId, 'state_licenses')
      ? filterByAccess(listMaterialsByFeature('state_licenses'), partnerId)
      : [],
  });
});

export default router;
