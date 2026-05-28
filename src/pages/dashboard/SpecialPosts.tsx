import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { specialPostService, type SpecialPost, type SpecialPostPayload } from '../../services/special-post.service';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, FileText, Calendar } from 'lucide-react';
import './SpecialPosts.css';

const SpecialPosts = () => {
  const [posts, setPosts] = useState<SpecialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SpecialPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState<SpecialPost | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', scheduledAt: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadPosts = useCallback(async (reset: boolean = false) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true; setLoading(true); setError(null);
      const response = await specialPostService.getSpecialPosts(reset ? 1 : page, 10, searchTerm);
      if (reset) { setPosts(response.posts); setPage(2); }
      else { setPosts(prev => [...prev, ...response.posts]); setPage(prev => prev + 1); }
      setHasMore(response.pageNumber < response.totalPages);
    } catch (err) { console.error(err); setError('No se pudieron cargar los posts'); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [searchTerm, page]);

  useEffect(() => {
    setPosts([]); setPage(1); setHasMore(true); loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) loadPosts();
    }, { rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadPosts]);

  const stripHtml = (html: string) => { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ''; };
  const reloadList = () => { setPage(1); setPosts([]); setHasMore(true); loadPosts(true); };

  return (
    <div className="special-posts-page">
      <div className="page-header"><div><h1>Posts Especiales</h1><p>Administra los posts destacados</p></div>
        <button className="btn btn-primary create-btn" onClick={() => { setEditingPost(null); setFormData({title:'',content:'',scheduledAt:''}); setShowModal(true); }}><Plus size={18} /> Nuevo Post</button></div>
      {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
      <div className="search-bar"><div className="search-input"><Search size={18} /><input type="text" placeholder="Buscar post..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
      <div className="posts-container">
        {posts.length === 0 && !loading ? (<div className="empty-state"><FileText size={48} /><p>No se encontraron posts</p></div>
        ) : (<>
          {posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-title" dangerouslySetInnerHTML={{ __html: post.title }} />
                <div className="post-date"><Calendar size={14} /><span>{new Date(post.createdAt).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
              </div>
              <div className="post-content-preview">{stripHtml(post.content).substring(0,150)}{stripHtml(post.content).length>150&&'...'}</div>
              <div className="post-actions">
                <button className="icon-btn edit" onClick={() => { setEditingPost(post); setFormData({title:post.title,content:post.content,scheduledAt:post.scheduledAt?new Date(post.scheduledAt).toLocaleString('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).replace(' ','T').substring(0,16):''}); setShowModal(true); }}><Edit2 size={16} /> Editar</button>
                <button className="icon-btn delete" onClick={() => { setDeletingPost(post); setShowDeleteConfirm(true); }}><Trash2 size={16} /> Eliminar</button>
              </div>
            </div>
          ))}
          <div ref={sentinelRef} style={{height:1}} />
          {loading && <div className="loading-more"><div className="spinner"></div><span>Cargando...</span></div>}
          {!hasMore && posts.length > 0 && <div className="loading-more" style={{color:'#94a3b8'}}><span>No hay más posts</span></div>}
        </>)}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal post-modal">
            <div className="modal-header"><h3>{editingPost?'Editar Post':'Nuevo Post'}</h3><button className="close-btn" onClick={()=>setShowModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <div className="form-group"><label>Título</label><input type="text" value={formData.title} onChange={e=>setFormData(p=>({...p,title:e.target.value}))} /></div>
              <div className="form-group"><label>Contenido</label><Editor value={formData.content} init={{height:350,menubar:true,plugins:['advlist','autolink','lists','link','image','charmap','anchor','searchreplace','visualblocks','code','fullscreen','insertdatetime','media','table','preview','help','wordcount'],toolbar:'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | code fullscreen | removeformat help'}} onEditorChange={c=>setFormData(p=>({...p,content:c}))} /></div>
              <div className="form-group"><label>Programado para</label><input type="datetime-local" value={formData.scheduledAt} onChange={e=>setFormData(p=>({...p,scheduledAt:e.target.value}))} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)} disabled={saving}>Cancelar</button><button className="btn btn-primary" onClick={async()=>{try{setSaving(true);setError(null);const payload:SpecialPostPayload={title:formData.title,content:formData.content,scheduledAt:formData.scheduledAt?new Date(formData.scheduledAt).toISOString():undefined};if(editingPost){await specialPostService.updateSpecialPost(editingPost.id,payload);setSuccess('Post actualizado');}else{await specialPostService.createSpecialPost(payload);setSuccess('Post creado');}setShowModal(false);setTimeout(()=>setSuccess(null),3000);reloadList();}catch(err){setError('Error al guardar');console.error(err);}finally{setSaving(false);}}} disabled={saving}>{saving?'Guardando...':'Guardar'}</button></div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal"><div className="modal-body confirm-body"><AlertTriangle size={48} className="warning-icon" /><h4>¿Estás seguro?</h4><p>Vas a eliminar el post <strong>{deletingPost?.title||''}</strong></p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowDeleteConfirm(false)} disabled={saving}>Cancelar</button><button className="btn btn-danger" onClick={async()=>{if(!deletingPost)return;try{setSaving(true);setError(null);await specialPostService.deleteSpecialPost(deletingPost.id);setSuccess('Post eliminado');setShowDeleteConfirm(false);setDeletingPost(null);setTimeout(()=>setSuccess(null),3000);reloadList();}catch(_err){setError('Error al eliminar');}finally{setSaving(false);}}} disabled={saving}>{saving?'Eliminando...':'Eliminar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialPosts;