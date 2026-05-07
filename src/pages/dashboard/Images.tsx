import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Image as ImageIcon, Calendar, Upload } from 'lucide-react';
import { imageService, type Image } from '../../services/image.service';
import './Images.css';

//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

const ImagesPage = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingImage, setDeletingImage] = useState<Image | null>(null);
  
  const [uploadFiles, setUploadFiles] = useState<Array<{ file: File; name: string; preview: string }>>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadImages = useCallback(async (reset: boolean = false) => {
    setLoading(currentLoading => {
      if (currentLoading) return currentLoading;
      return true;
    });
    
    try {
      setError(null);
      
      const currentPage = reset ? 1 : pageRef.current;      
      const response = await imageService.getImages(currentPage, 10, searchTerm);
      
      if (reset) {
        setImages(response.items);
        setPage(2);
      } else {
        setImages(prev => [...prev, ...response.items]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.hasNextPage);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las imágenes');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    loadImages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setImages([]);
      setPage(1);
      setHasMore(true);
      loadImages(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, loadImages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadImages();
    }
  };

  const openUploadModal = () => {
    setEditingImage(null);
    setUploadFiles([]);
    setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      const newFiles = files.map(file => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        preview: URL.createObjectURL(file)
      }));
      
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateFileName = (index: number, name: string) => {
    setUploadFiles(prev => {
      const updated = [...prev];
      updated[index].name = name;
      return updated;
    });
  };

  const openEditModal = (image: Image) => {
    setEditingImage(image);
    setShowModal(true);
  };

  const openDeleteModal = (image: Image) => {
    setDeletingImage(image);
    setShowDeleteConfirm(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSave = async () => {
    if (editingImage) {
      // TODO: Implementar edición si el backend lo soporta
      setError('Edición de nombre aún no implementada');
      return;
    }

    if (uploadFiles.length === 0) {
      setError('Debes seleccionar al menos una imagen');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await imageService.uploadImages(uploadFiles);

      setSuccess(`${uploadFiles.length} imágen(es) subidas correctamente`);
      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setImages([]);
      setPage(1);
      setHasMore(true);
      loadImages(true);
      
    } catch (err) {
      setError('No se pudieron subir las imágenes. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingImage) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await imageService.deleteImage(deletingImage.id);
      
      setSuccess('Imagen eliminada correctamente');
      setShowDeleteConfirm(false);
      setDeletingImage(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setImages([]);
      setPage(1);
      setHasMore(true);
      loadImages(true);
      
    } catch (err) {
      setError('No se pudo eliminar la imagen. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="special-posts-page">
      <div className="page-header">
        <div>
          <h1>Galería de Imágenes</h1>
          <p>Administra todas las imágenes del sistema</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openUploadModal}>
          <Plus size={18} />
          Subir Imágenes
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Buscador */}
      <div className="search-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar imagen por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Imágenes */}
      <div className="posts-container" onScroll={handleScroll}>
        {images.length === 0 && !loading ? (
          <div className="empty-state">
            <ImageIcon size={48} />
            <p>No se encontraron imágenes</p>
          </div>
        ) : (
          <>
            <div className="images-grid">
              {images.map(image => (
                <div key={image.id} className="image-card">
                  <div className="image-preview">
                    <img src={new URL(image.url, import.meta.env.VITE_API_BASE_URL).href} alt={image.name} loading="lazy" />
                  </div>
                  
                  <div className="image-info">
                    <div className="image-name">{image.name || image.fileName}</div>
                    <div className="image-meta">
                      <span className="meta-item">
                        <Calendar size={12} />
                        {formatDate(image.date)}
                      </span>
                    </div>
                    <div className="image-full-url" onClick={() => navigator.clipboard.writeText(new URL(image.url, import.meta.env.VITE_API_BASE_URL).href)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <span>{new URL(image.url, import.meta.env.VITE_API_BASE_URL).href}</span>
                    </div>
                  </div>

                  <div className="image-actions">
                    <button className="icon-btn edit" onClick={() => openEditModal(image)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-btn delete" onClick={() => openDeleteModal(image)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="loading-more">
                <div className="spinner"></div>
                <span>Cargando más imágenes...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Subir Imágenes */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal post-modal">
            <div className="modal-header">
              <h3>{editingImage ? 'Editar Imagen' : 'Subir Nuevas Imágenes'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {!editingImage && (
                <div className="form-group">
                  <label>Seleccionar archivos</label>
                  <div className="upload-area">
                    <Upload size={32} />
                    <p>Arrastrá imágenes acá o hacé click para seleccionar</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      hidden
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="btn btn-secondary">
                      Seleccionar Archivos
                    </label>
                  </div>

                  {uploadFiles.length > 0 && (
                    <div className="files-list">
                      {uploadFiles.map((item, index) => (
                        <div key={index} className="file-item">
                          <img src={item.preview} alt={`Preview ${index}`} className="file-preview" />
                          <div className="file-info">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateFileName(index, e.target.value)}
                              placeholder="Nombre para la imagen"
                              className="file-name-input"
                            />
                            <div className="file-original-name">{item.file.name}</div>
                          </div>
                          <button className="remove-btn" onClick={() => removeFile(index)}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Subiendo...' : 'Subir Imágenes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-body confirm-body">
              <AlertTriangle size={48} className="warning-icon" />
              <h4>¿Estás seguro?</h4>
              <p>
                Vas a eliminar la imagen <strong>{deletingImage?.name || deletingImage?.fileName}</strong>. 
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;