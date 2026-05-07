import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { specialPostService, type SpecialPost } from '../../services/special-post.service';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, FileText, Calendar } from 'lucide-react';
import './SpecialPosts.css';

const SpecialPosts = () => {
  const [posts, setPosts] = useState<SpecialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Solución oficial React para acceder al estado actual sin dependencias
  // Usamos una ref que siempre contiene el valor actualizado de page
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SpecialPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState<SpecialPost | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPosts = useCallback(async (reset: boolean = false) => {
    // Usamos función updater para verificar el estado actual de loading sin dependencia
    setLoading(currentLoading => {
      if (currentLoading) return currentLoading;
      return true;
    });
    
    try {
      setError(null);
      
      const currentPage = reset ? 1 : pageRef.current;      
      const response = await specialPostService.getSpecialPosts(currentPage, 10, searchTerm);
      
      if (reset) {
        setPosts(response.posts);
        setPage(2);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.pageNumber < response.totalPages);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los posts especiales');
    } finally {
      setLoading(false);
    }
  // ✅ Solución definitiva: eliminamos loading de dependencias, no hay bucle
  }, [searchTerm]);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPosts([]);
      setPage(1);
      setHasMore(true);
      loadPosts(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, loadPosts]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadPosts();
    }
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: ''
    });
    setShowModal(true);
  };

  const openEditModal = (post: SpecialPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content
    });
    setShowModal(true);
  };

  const openDeleteModal = (post: SpecialPost) => {
    setDeletingPost(post);
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
    try {
      setSaving(true);
      setError(null);

      if (editingPost) {
        await specialPostService.updateSpecialPost(editingPost.id, formData);
        setSuccess('Post actualizado correctamente');
      } else {
        await specialPostService.createSpecialPost(formData);
        setSuccess('Post creado correctamente');
      }

      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setPosts([]);
      setPage(1);
      setHasMore(true);
      loadPosts(true);
      
    } catch (err) {
      setError('No se pudo guardar el post. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await specialPostService.deleteSpecialPost(deletingPost.id);
      
      setSuccess('Post eliminado correctamente');
      setShowDeleteConfirm(false);
      setDeletingPost(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setPosts([]);
      setPage(1);
      setHasMore(true);
      loadPosts(true);
      
    } catch (err) {
      setError('No se pudo eliminar el post. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="special-posts-page">
      <div className="page-header">
        <div>
          <h1>Posts Especiales</h1>
          <p>Administra los posts destacados del sistema</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo Post
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
            placeholder="Buscar post por título o contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Posts */}
      <div className="posts-container" onScroll={handleScroll}>
        {posts.length === 0 && !loading ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No se encontraron posts especiales</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <div className="post-title" dangerouslySetInnerHTML={{ __html: post.title }} />
                  <div className="post-date">
                    <Calendar size={14} />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                
                <div className="post-content-preview">
                  {stripHtml(post.content).substring(0, 150)}
                  {stripHtml(post.content).length > 150 && '...'}
                </div>

                <div className="post-actions">
                  <button className="icon-btn edit" onClick={() => openEditModal(post)}>
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button className="icon-btn delete" onClick={() => openDeleteModal(post)}>
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            {loading && (
              <div className="loading-more">
                <div className="spinner"></div>
                <span>Cargando más posts...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal post-modal">
            <div className="modal-header">
              <h3>{editingPost ? 'Editar Post Especial' : 'Nuevo Post Especial'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Título (admite HTML)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="<h2>Título del Post</h2>"
                />
              </div>

              <div className="form-group">
                <label>Contenido (admite HTML completo)</label>
                <Editor
                  value={formData.content}
                  init={{
                    height: 350,
                    menubar: true,
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | code fullscreen | removeformat help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                  }}
                  onEditorChange={(newContent) => {
                    setFormData(prev => ({ ...prev, content: newContent }));
                  }}
                />
              </div>

              <div className="form-hint">
                💡 Puedes utilizar cualquier etiqueta HTML en ambos campos. No hay sanitización en el backend.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
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
                Vas a eliminar el post <strong dangerouslySetInnerHTML={{ __html: deletingPost?.title || '' }} />. 
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

export default SpecialPosts;