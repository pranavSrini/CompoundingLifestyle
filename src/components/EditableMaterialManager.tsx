import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import MaterialCard from './MaterialCard';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteEditableMaterial,
  fetchEditableMaterials,
  openMaterialFileInNewTab,
  updateEditableMaterial,
  uploadEditableMaterial,
  type EditableMaterialFeature,
  type EditableMaterialItem,
} from '../lib/api';
import '../pages/PageLayout.css';
import '../pages/Monographs.css';

type Props = {
  feature: EditableMaterialFeature;
  title: string;
  subtitle: string;
  emptyText: string;
  uploadTitle?: string;
  categoryPlaceholder?: string;
  defaultCategory?: string;
};

export default function EditableMaterialManager({
  feature,
  title,
  subtitle,
  emptyText,
  uploadTitle = 'Upload file',
  categoryPlaceholder = 'e.g. pricing, brochures, state-licenses',
  defaultCategory = '',
}: Props) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<EditableMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState<EditableMaterialItem | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchEditableMaterials(feature));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [feature]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const titleValue = (formData.get('title') as string)?.trim();
    const category = (formData.get('category') as string)?.trim() || defaultCategory;
    const description = (formData.get('description') as string)?.trim() || '';
    const file = formData.get('file') as File | null;
    if (!titleValue || !file?.size) {
      setError('Title and file are required');
      return;
    }
    formData.set('title', titleValue);
    formData.set('category', category);
    formData.set('description', description);
    setError(null);
    try {
      await uploadEditableMaterial(feature, formData);
      setUploadOpen(false);
      form.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const titleValue = (formData.get('title') as string)?.trim();
    const category = (formData.get('category') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || '';
    if (!titleValue) {
      setError('Title is required');
      return;
    }
    formData.set('title', titleValue);
    formData.set('category', category);
    formData.set('description', description);
    setError(null);
    try {
      await updateEditableMaterial(editItem.id, formData);
      setEditItem(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!editItem) return;
    const ok = window.confirm(`Delete "${editItem.title}"? This removes the file from the portal.`);
    if (!ok) return;
    setError(null);
    try {
      await deleteEditableMaterial(editItem.id);
      setEditItem(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const modal = (mode: 'upload' | 'edit', item?: EditableMaterialItem) => (
    <div className="modal-overlay" onClick={() => (mode === 'upload' ? setUploadOpen(false) : setEditItem(null))}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'upload' ? uploadTitle : 'Edit file'}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={() => (mode === 'upload' ? setUploadOpen(false) : setEditItem(null))}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={mode === 'upload' ? handleUpload : handleEdit}>
          <div className="modal-body">
            <div className="form-group">
              <label>
                Title <span className="required">*</span>
              </label>
              <input type="text" name="title" required defaultValue={item?.title ?? ''} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                defaultValue={item?.category ?? defaultCategory}
                placeholder={categoryPlaceholder}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" rows={3} defaultValue={item?.description ?? ''} />
            </div>
            <div className="form-group">
              <label>
                {mode === 'upload' ? 'File' : 'Replace file (optional)'}
                {mode === 'upload' && <span className="required"> *</span>}
              </label>
              <p className="modal-field-hint">PDF, DOCX, XLSX, PNG, JPG, GIF, and WebP are supported.</p>
              <div className="modal-file-wrap">
                <input type="file" name="file" required={mode === 'upload'} />
              </div>
              {item && (
                <div className="modal-current-file">
                  <span className="file-name">{item.fileName}</span>
                  <span>— leave empty to keep</span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            {mode === 'edit' && (
              <button type="button" className="btn btn-secondary material-delete-btn" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (mode === 'upload' ? setUploadOpen(false) : setEditItem(null))}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'upload' ? 'Upload' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="page-layout">
      <header className="page-header page-header-row">
        <div>
          <h1>{title}</h1>
          <p className="page-subtitle">
            {subtitle}
            {isAdmin ? ' Upload, edit, or remove files below.' : ''}
          </p>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary btn-icon" onClick={() => setUploadOpen(true)}>
            <Plus size={18} />
            Upload
          </button>
        )}
      </header>

      {error && (
        <div className="monograph-error" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="monograph-loading">Loading…</p>}
      {!loading && !error && items.length === 0 && <p className="page-subtitle">{emptyText}</p>}
      {!loading && items.length > 0 && (
        <div className="material-grid">
          {items.map((item) => (
            <MaterialCard
              key={item.id}
              title={item.title}
              fileType={item.fileType}
              description={item.description || (item.category ? `Category: ${item.category}` : undefined)}
              onView={() => {
                void openMaterialFileInNewTab(item.id).catch((e) => {
                  window.alert(e instanceof Error ? e.message : 'Could not open file');
                });
              }}
              onEdit={isAdmin ? () => setEditItem(item) : undefined}
            />
          ))}
        </div>
      )}

      {uploadOpen && modal('upload')}
      {editItem && modal('edit', editItem)}
    </div>
  );
}
