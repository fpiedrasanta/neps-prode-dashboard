import { useState, useEffect, useCallback, useRef } from 'react';
import { teamService, type Team } from '../../services/team.service';
import { countryService, type Country } from '../../services/country.service';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Users } from 'lucide-react';
import './Teams.css';

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', countryId: '', flagImage: null as File | null, flagPreview: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countryService.getCountries(undefined, 'name', false, 1, 100);
        setCountries(response.items);
        if (response.items.length > 0) setFormData(prev => ({ ...prev, countryId: response.items[0].id }));
      } catch (err) { console.error(err); }
    };
    loadCountries();
  }, []);

  // EXACTAMENTE IGUAL QUE COUNTRIES
  const loadTeams = useCallback(async (reset: boolean = false) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true; setLoading(true); setError(null);
      const response = await teamService.getTeams(searchTerm, 'name', false, reset ? 1 : page, 10);
      if (reset) { setTeams(response.items); setPage(2); }
      else { setTeams(prev => [...prev, ...response.items]); setPage(prev => prev + 1); }
      setHasMore(response.hasNextPage);
    } catch (err) { setError('No se pudieron cargar los equipos'); console.error(err); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [searchTerm, page]);

  useEffect(() => {
    setTeams([]); setPage(1); setHasMore(true); loadTeams(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) loadTeams();
    }, { rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadTeams]);

  const reloadList = () => { setPage(1); setTeams([]); setHasMore(true); loadTeams(true); };

  return (
    <div className="teams-page">
      <div className="page-header"><div><h1>Gestión de Equipos</h1><p>Administra los equipos</p></div><button className="btn btn-primary create-btn" onClick={() => { setEditingTeam(null); setFormData({name:'',countryId:countries[0]?.id||'',flagImage:null,flagPreview:''}); setShowModal(true); }}><Plus size={18} /> Nuevo Equipo</button></div>
      {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
      <div className="search-bar"><div className="search-input"><Search size={18} /><input type="text" placeholder="Buscar equipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
      <div className="teams-container">
        <table className="teams-table"><thead><tr><th>Bandera</th><th>Nombre</th><th>País</th><th>Acciones</th></tr></thead>
          <tbody>{teams.map(team => (
            <tr key={team.id}>
              <td><img src={teamService.getFlagFullUrl(team.flagUrl)} alt={team.name} className="team-flag" /></td>
              <td className="team-name">{team.name}</td><td>{team.countryName}</td>
              <td className="actions"><button className="icon-btn edit" onClick={() => { setEditingTeam(team); setFormData({name:team.name,countryId:team.countryId,flagImage:null,flagPreview:teamService.getFlagFullUrl(team.flagUrl)}); setShowModal(true); }}><Edit2 size={16} /></button><button className="icon-btn delete" onClick={() => { setDeletingTeam(team); setShowDeleteConfirm(true); }}><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loading && <div className="loading-more"><div className="spinner"></div><span>Cargando más equipos...</span></div>}
        {!hasMore && teams.length > 0 && <div className="loading-more" style={{ color: '#94a3b8' }}><span>No hay más equipos</span></div>}
        {teams.length === 0 && !loading && <div className="empty-state"><p>No se encontraron equipos</p></div>}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal country-modal">
            <div className="modal-header"><h3>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</h3><button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <div className="modal-body"><div className="form-grid">
              <div className="form-group"><label>Nombre</label><input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({...prev,name:e.target.value}))} /></div>
              <div className="form-group"><label>País</label><select value={formData.countryId} onChange={(e) => setFormData(prev => ({...prev,countryId:e.target.value}))}>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="form-group full-width"><label>Bandera</label><input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setFormData(prev => ({...prev,flagImage:f,flagPreview:f?URL.createObjectURL(f):prev.flagPreview})); }} className="hidden-input" /><div className="file-upload" onClick={() => fileInputRef.current?.click()}>{formData.flagPreview ? <img src={formData.flagPreview} alt="Preview" className="flag-preview" /> : <><Users size={24} /><span>Seleccionar imagen</span></>}</div></div>
            </div></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button><button className="btn btn-primary" onClick={async () => { try { setSaving(true); setError(null); if (editingTeam) { await teamService.updateTeam({id:editingTeam.id,name:formData.name,countryId:formData.countryId,flagImage:formData.flagImage}); setSuccess('Equipo actualizado'); } else { await teamService.createTeam({name:formData.name,countryId:formData.countryId,flagImage:formData.flagImage}); setSuccess('Equipo creado'); } setShowModal(false); setTimeout(() => setSuccess(null),3000); reloadList(); } catch (err) { setError('Error al guardar'); console.error(err); } finally { setSaving(false); } }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal"><div className="modal-body confirm-body"><AlertTriangle size={48} className="warning-icon" /><h4>¿Estás seguro?</h4><p>Vas a eliminar <strong>{deletingTeam?.name}</strong></p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>Cancelar</button><button className="btn btn-danger" onClick={async () => { if (!deletingTeam) return; try { setSaving(true); setError(null); await teamService.deleteTeam(deletingTeam.id); setSuccess('Equipo eliminado'); setShowDeleteConfirm(false); setDeletingTeam(null); setTimeout(() => setSuccess(null),3000); reloadList(); } catch { setError('Error al eliminar'); } finally { setSaving(false); } }} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;