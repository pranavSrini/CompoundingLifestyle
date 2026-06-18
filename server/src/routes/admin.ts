import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireFeature.js';
import {
  createPartner,
  deletePartner,
  getPartnerByEmail,
  listPartnersForAdmin,
  updatePartnerAccess,
  updatePartnerPassword,
  type Role,
} from '../db/index.js';
import { deleteProviderProfile } from '../db/providerProfile.js';
import { config } from '../config.js';
import { ALL_FEATURES, FEATURE_LABELS, isValidFeatureKey } from '../features.js';
import { getMaterialCatalog } from '../materialCatalog.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/partners', (_req: Request, res: Response) => {
  res.json({ partners: listPartnersForAdmin() });
});

router.post('/partners', async (req: Request, res: Response) => {
  const body = req.body as {
    email?: string;
    name?: string;
    password?: string;
    role?: Role;
    allowed_features?: string[] | null;
    allowed_material_ids?: string[] | null;
  };
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password;
  const role = body.role ?? 'provider';

  if (!email || !name || !password) {
    res.status(400).json({ error: 'Email, name, and password required' });
    return;
  }
  if (!['admin', 'provider', 'sales_rep'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  if (body.allowed_features !== undefined && body.allowed_features !== null) {
    if (!Array.isArray(body.allowed_features)) {
      res.status(400).json({ error: 'allowed_features must be an array or null' });
      return;
    }
    const bad = body.allowed_features.find((k) => !isValidFeatureKey(k));
    if (bad) {
      res.status(400).json({ error: `Invalid feature key: ${bad}` });
      return;
    }
  }
  if (body.allowed_material_ids !== undefined && body.allowed_material_ids !== null && !Array.isArray(body.allowed_material_ids)) {
    res.status(400).json({ error: 'allowed_material_ids must be an array or null' });
    return;
  }
  if (getPartnerByEmail(email)) {
    res.status(409).json({ error: 'Partner with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const id = randomUUID();
  createPartner(
    id,
    email,
    name,
    passwordHash,
    role,
    role === 'admin' ? null : body.allowed_features ?? null,
    role === 'admin' ? null : body.allowed_material_ids ?? null,
  );
  const partner = listPartnersForAdmin().find((p) => p.id === id);
  res.status(201).json({ partner });
});

router.patch('/partners/:id/password', async (req: Request, res: Response) => {
  const id = req.params.id;
  const body = req.body as { password?: string };
  const password = body.password?.trim();
  const partner = listPartnersForAdmin().find((p) => p.id === id);

  if (!partner) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }
  if (partner.role === 'admin') {
    res.status(400).json({ error: 'Admin passwords cannot be reset here' });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const updated = updatePartnerPassword(id, passwordHash);
  res.json({ partner: updated });
});

router.patch('/partners/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const body = req.body as {
    role?: Role;
    allowed_features?: string[] | null;
    allowed_material_ids?: string[] | null;
  };
  const updates: {
    role?: Role;
    allowed_features?: string[] | null;
    allowed_material_ids?: string[] | null;
  } = {};

  if (body.role !== undefined) {
    if (!['admin', 'provider', 'sales_rep'].includes(body.role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    updates.role = body.role;
  }

  if (body.allowed_features !== undefined) {
    if (body.allowed_features === null) {
      updates.allowed_features = null;
    } else if (Array.isArray(body.allowed_features)) {
      const bad = body.allowed_features.find((k) => !isValidFeatureKey(k));
      if (bad) {
        res.status(400).json({ error: `Invalid feature key: ${bad}` });
        return;
      }
      updates.allowed_features = body.allowed_features;
    } else {
      res.status(400).json({ error: 'allowed_features must be an array or null' });
      return;
    }
  }

  if (body.allowed_material_ids !== undefined) {
    if (body.allowed_material_ids === null) {
      updates.allowed_material_ids = null;
    } else if (Array.isArray(body.allowed_material_ids)) {
      updates.allowed_material_ids = body.allowed_material_ids;
    } else {
      res.status(400).json({ error: 'allowed_material_ids must be an array or null' });
      return;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updates' });
    return;
  }

  const row = updatePartnerAccess(id, updates);
  if (!row) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }
  res.json({ partner: row });
});

router.delete('/partners/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const partners = listPartnersForAdmin();
  const partner = partners.find((p) => p.id === id);

  if (!partner) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }
  if (req.partnerId === id) {
    res.status(400).json({ error: 'You cannot delete your own account while signed in' });
    return;
  }
  if (partner.role === 'admin' && partners.filter((p) => p.role === 'admin').length <= 1) {
    res.status(400).json({ error: 'Cannot delete the last admin account' });
    return;
  }

  const deleted = deletePartner(id);
  deleteProviderProfile(id);
  res.json({ partner: deleted });
});

router.get('/features', (_req: Request, res: Response) => {
  res.json({
    features: ALL_FEATURES.map((key) => ({ key, label: FEATURE_LABELS[key] })),
  });
});

router.get('/material-catalog', (_req: Request, res: Response) => {
  res.json({ catalog: getMaterialCatalog() });
});

export default router;
