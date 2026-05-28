import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Image as ImageIcon, Calendar, Upload } from 'lucide-react';
import { imageService, type Image } from '../../services/image.service';
import { API_CONFIG } from '../../config/api';
import './Images.css';

const ImagesPage = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingImage, setDeletingImage] = useState<Image | null>(null);
  const [uploadFiles, setUploadFiles] = useState<Array<{ file: File; name: string; preview: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadImages = useCallback(async (reset: boolean = false) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true; setLoading(true); setError(null);
      const response = await imageService.getImages(reset ? 1 : page, 10, searchTerm);
      if (reset) { setImages(response.items); setPage(2); }
      else { setImages(prev => [...prev, ...response.items]); setPage(prev => prev + 1); }
      setHasMore(response.hasNextPage);
    } catch (err) { console.error(err); setError('No se pudieron cargar las imágenes'); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [searchTerm, page]);

  useEffect(() => {
    setImages([]); setPage(1); setHasMore(true); loadImages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) loadImages();
    }, { rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadImages]);

  const reloadList = () => { setPage(1); setImages([]); setHasMore(true); loadImages(true); };

  return (
    <div className="special-posts-page">
      <div className="page-header"><div><h1>Galería de Imágenes</h1><p>Administra todas las imágenes del sistema</p></div>
        <button className="btn btn-primary create-btn" onClick={() => { setEditingImage(null); setUploadFiles([]); setShowModal(true); }}><Plus size={18} /> Subir Imágenes</button></div>
      {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
      <div className="search-bar"><div className="search-input"><Search size={18} /><input type="text" placeholder="Buscar imagen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
      <div className="posts-container">
        {images.length === 0 && !loading ? (<div className="empty-state"><ImageIcon size={48} /><p>No se encontraron imágenes</p></div>
        ) : (<>
          <div className="images-grid">
            {images.map(image => (
              <div key={image.id} className="image-card">
                <div className="image-preview"><img src={new URL(image.url, API_CONFIG.CDN_URL).href} alt={image.name} loading="lazy" /></div>
                <div className="image-info">
                  <div className="image-name">{image.name || image.fileName}</div>
                  <div className="image-meta"><span className="meta-item"><Calendar size={12} />{new Date(image.date).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
                </div>
                <div className="image-actions">
                  <button className="icon-btn edit" onClick={() => { setEditingImage(image); setShowModal(true); }}><Edit2 size={14} /></button>
                  <button className="icon-btn delete" onClick={() => { setDeletingImage(image); setShowDeleteConfirm(true); }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} style={{height:1}} />
          {loading && <div className="loading-more"><div className="spinner"></div><span>Cargando...</span></div>}
          {!hasMore && images.length > 0 && <div className="loading-more" style={{color:'#94a3b8'}}><span>No hay más imágenes</span></div>}
        </>)}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal post-modal">
            <div className="modal-header"><h3>{editingImage?'Editar Imagen':'Subir Imágenes'}</h3><button className="close-btn" onClick={()=>setShowModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              {!editingImage && (<div className="form-group">
                <label>Seleccionar archivos</label>
                <div className="upload-area"><Upload size={32} /><p>Arrastrá imágenes o hacé click</p><input type="file" multiple accept="image/*" onChange={e=>{if(e.target.files)setUploadFiles(p=>[...p,...Array.from(e.target.files!).map(f=>({file:f,name:f.name.replace(/\.[^/.]+$/,''),preview:URL.createObjectURL(f)}))]);}} hidden id="file-input" /><label htmlFor="file-input" className="btn btn-secondary">Seleccionar</label></div>
                {uploadFiles.length>0&&(<div className="files-list">{uploadFiles.map((item,idx)=>(
                  <div key={idx} className="file-item"><img src={item.preview} alt="" className="file-preview" /><div className="file-info"><input type="text" value={item.name} onChange={e=>setUploadFiles(p=>{const u=[...p];u[idx].name=e.target.value;return u;})} className="file-name-input" /><div className="file-original-name">{item.file.name}</div></div><button className="remove-btn" onClick={()=>setUploadFiles(p=>{URL.revokeObjectURL(p[idx].preview);return p.filter((_,i)=>i!==idx);})}><X size={16} /></button></div>
                ))}</div>)}
              </div>)}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)} disabled={saving}>Cancelar</button><button className="btn btn-primary" onClick={async()=>{if(editingImage){setError('Edición no implementada');return;}if(uploadFiles.length===0){setError('Seleccioná al menos una imagen');return;}try{setSaving(true);setError(null);await imageService.uploadImages(uploadFiles);setSuccess(`${uploadFiles.length} imagen(es) subidas`);setShowModal(false);setTimeout(()=>setSuccess(null),3000);setUploadFiles([]);reloadList();}catch(err){setError('Error al subir');console.error(err);}finally{setSaving(false);}}} disabled={saving}>{saving?'Subiendo...':'Subir'}</button></div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="modal-overlay"><div className="modal"><div className="modal-body confirm-body"><AlertTriangle size={48} className="warning-icon" /><h4>¿Estás seguro?</h4><p>Vas a eliminar <strong>{deletingImage?.name||deletingImage?.fileName}</strong></p></div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowDeleteConfirm(false)} disabled={saving}>Cancelar</button><button className="btn btn-danger" onClick={async()=>{if(!deletingImage)return;try{setSaving(true);setError(null);await imageService.deleteImage(deletingImage.id);setSuccess('Imagen eliminada');setShowDeleteConfirm(false);setDeletingImage(null);setTimeout(()=>setSuccess(null),3000);reloadList();}catch(_err){setError('Error al eliminar');}finally{setSaving(false);}}} disabled={saving}>{saving?'Eliminando...':'Eliminar'}</button></div>
        </div></div>
      )}
    </div>
  );
};

export default ImagesPage;