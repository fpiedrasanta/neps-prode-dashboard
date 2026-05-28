import { useState, useEffect, useCallback, useRef } from 'react';
import { matchService, type Match } from '../../services/match.service';
import { countryService, type Country } from '../../services/country.service';
import { cityService, type City } from '../../services/city.service';
import { teamService, type Team } from '../../services/team.service';
import { Search, Edit2, X, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { API_CONFIG } from '../../config/api';
import './Matches.css';

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<1 | 2 | 3 | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [showResultModal, setShowResultModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState({ homeScore: 0, awayScore: 0 });
  const [showConfirmResultModal, setShowConfirmResultModal] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editMatchMode, setEditMatchMode] = useState<'create' | 'edit'>('create');
  const [matchForm, setMatchForm] = useState({ homeTeamId: '', awayTeamId: '', matchDate: '', cityId: '', countryId: '' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadMatches = useCallback(async (reset: boolean = false) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true; setLoading(true); setError(null);
      const response = await matchService.getMatches(statusFilter, searchTerm, reset ? 1 : page, 10);
      if (reset) { setMatches(response.items); setPage(2); }
      else { setMatches(prev => [...prev, ...response.items]); setPage(prev => prev + 1); }
      setHasMore(response.hasNextPage);
      hasMoreRef.current = response.hasNextPage;
    } catch (err) { setError('No se pudieron cargar los partidos'); console.error(err); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [statusFilter, searchTerm, page]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [countriesRes, teamsRes] = await Promise.all([
          countryService.getCountries(undefined, 'name', false, 1, 9999),
          teamService.getTeams(undefined, 'name', false, 1, 9999)
        ]);
        setCountries(countriesRes.items); setTeams(teamsRes.items);
      } catch (err) { console.error(err); }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    if (matchForm.countryId) {
      cityService.getCities(matchForm.countryId, undefined, 'name', false, 1, 9999)
        .then(res => setCities(res.items)).catch(err => console.error(err));
    } else setCities([]);
  }, [matchForm.countryId]);

  useEffect(() => {
    setMatches([]); setPage(1); setHasMore(true); hasMoreRef.current = true; loadMatches(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchTerm]);

  // Ref para que el observer siempre llame la última versión de loadMatches
  const loadMatchesRef = useRef(loadMatches);
  useEffect(() => { loadMatchesRef.current = loadMatches; }, [loadMatches]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
        loadMatchesRef.current();
      }
    }, { rootMargin: '100px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, statusFilter, searchTerm]);

  const reloadList = () => { setPage(1); setMatches([]); setHasMore(true); hasMoreRef.current = true; loadMatches(true); };

  const statusLabel: Record<number, string> = { 1: 'Próximo', 2: 'En Juego', 3: 'Finalizado' };
  const statusClass: Record<number, string> = { 1: 'status-upcoming', 2: 'status-live', 3: 'status-finished' };

  return (
    <div className="matches-page">
      <div className="page-header"><div><h1>Partidos</h1><p>Administra los partidos y carga resultados</p></div>
        <button className="btn btn-primary create-btn" onClick={() => { setEditMatchMode('create'); setMatchForm({homeTeamId:teams[0]?.id||'',awayTeamId:teams[1]?.id||'',matchDate:new Date().toISOString().slice(0,16),cityId:'',countryId:countries[0]?.id||''}); setShowMatchModal(true); }}><Plus size={18} /> Nuevo Partido</button></div>
      {error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success">{success}</div>}
      <div className="filters-bar">
        <div className="search-input"><Search size={18} /><input type="text" placeholder="Buscar equipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="status-filters">
          <button className={`filter-btn ${statusFilter === 1 ? 'active' : ''}`} onClick={() => setStatusFilter(1)}>Próximos</button>
          <button className={`filter-btn ${statusFilter === 2 ? 'active' : ''}`} onClick={() => setStatusFilter(2)}>En Juego</button>
          <button className={`filter-btn ${statusFilter === 3 ? 'active' : ''}`} onClick={() => setStatusFilter(3)}>Finalizados</button>
        </div>
      </div>
      <div className="matches-container">
        {matches.length === 0 && !loading ? (<div className="empty-state"><p>No se encontraron partidos</p></div>
        ) : (<>
          {matches.map(match => (
            <div key={match.id} className={`match-card ${match.status === 3 ? 'finished' : ''}`}>
              <div className="match-header">
                <span className={`status-badge ${statusClass[match.status]}`}>{statusLabel[match.status]}</span>
                <span className="match-date">{new Date(match.matchDate).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                <div className="card-actions">
                  {match.status === 1 && (<>
                    <button className="icon-btn edit" onClick={() => { setEditMatchMode('edit');setEditingMatch(match);setMatchForm({homeTeamId:match.homeTeam.id,awayTeamId:match.awayTeam.id,matchDate:new Date(match.matchDate).toISOString().slice(0,16),cityId:match.city.id,countryId:match.country.id});setShowMatchModal(true); }}><Edit2 size={16} /></button>
                    <button className="icon-btn delete" onClick={() => { setDeletingMatch(match);setShowDeleteConfirm(true); }}><Trash2 size={16} /></button>
                  </>)}
                  {match.status === 2 && <button className="icon-btn edit" onClick={() => { setEditingMatch(match);setResultForm({homeScore:match.homeScore??0,awayScore:match.awayScore??0});setShowConfirmResultModal(false);setShowResultModal(true); }}><Edit2 size={16} /></button>}
                </div>
              </div>
              <div className="match-teams">
                <div className="team"><div className="team-header"><img src={!match.homeTeam.flagUrl?'':match.homeTeam.flagUrl.startsWith('http')?match.homeTeam.flagUrl:`${API_CONFIG.CDN_URL}${match.homeTeam.flagUrl}`} alt="" className="team-flag" /><span className="team-name">{match.homeTeam.name}</span></div><span className="score">{match.homeScore??'-'}</span></div>
                <span className="separator">VS</span>
                <div className="team"><div className="team-header"><span className="team-name">{match.awayTeam.name}</span><img src={!match.awayTeam.flagUrl?'':match.awayTeam.flagUrl.startsWith('http')?match.awayTeam.flagUrl:`${API_CONFIG.CDN_URL}${match.awayTeam.flagUrl}`} alt="" className="team-flag" /></div><span className="score">{match.awayScore??'-'}</span></div>
              </div>
              <div className="match-footer">{match.group&&<span className="group-tag">Grupo {match.group}</span>}<span className="city">{match.city.name}, {match.country.name}</span></div>
            </div>
          ))}
          <div ref={sentinelRef} style={{height:1}} />
          {loading && <div className="loading-more"><div className="spinner"></div><span>Cargando...</span></div>}
          {!hasMore && matches.length > 0 && <div className="loading-more" style={{color:'#94a3b8'}}><span>No hay más partidos</span></div>}
        </>)}
      </div>
      {/* modales */}
      {showResultModal && editingMatch && (
        <div className="modal-overlay"><div className="modal">
          <div className="modal-header"><h3>Cargar Resultado</h3><button className="close-btn" onClick={()=>{setEditingMatch(null);setShowResultModal(false);}}><X size={20} /></button></div>
          {!showConfirmResultModal ? (
            <><div className="modal-body"><div className="result-form">
              <div className="form-team"><label>{editingMatch.homeTeam.name}</label><input type="number" min="0" value={resultForm.homeScore} onChange={e=>setResultForm(p=>({...p,homeScore:parseInt(e.target.value)||0}))} /></div>
              <span className="form-separator">-</span>
              <div className="form-team"><label>{editingMatch.awayTeam.name}</label><input type="number" min="0" value={resultForm.awayScore} onChange={e=>setResultForm(p=>({...p,awayScore:parseInt(e.target.value)||0}))} /></div>
            </div></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>{setEditingMatch(null);setShowResultModal(false);}}>Cancelar</button><button className="btn btn-primary" onClick={()=>setShowConfirmResultModal(true)}>Guardar</button></div></>
          ) : (
            <><div className="modal-body confirm-body"><AlertTriangle size={48} className="warning-icon" /><h4>¿Estás seguro?</h4><p>El partido se marcará como Finalizado y se calcularán los puntos.</p><p className="warning-text">No se puede deshacer.</p><div className="confirm-result"><strong>{editingMatch.homeTeam.name} {resultForm.homeScore}</strong><span> - </span><strong>{resultForm.awayScore} {editingMatch.awayTeam.name}</strong></div></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowConfirmResultModal(false)} disabled={saving}>Volver</button><button className="btn btn-danger" onClick={async()=>{if(!editingMatch)return;try{setSaving(true);setError(null);await matchService.updateMatchResult(editingMatch.id,{homeScore:resultForm.homeScore,awayScore:resultForm.awayScore});setMatches(prev=>prev.map(m=>m.id===editingMatch.id?{...m,homeScore:resultForm.homeScore,awayScore:resultForm.awayScore,status:3 as const}:m));setSuccess('Resultado guardado!');setTimeout(()=>setSuccess(null),3000);setEditingMatch(null);setShowResultModal(false);setShowConfirmResultModal(false);}catch(err){setError('Error al guardar');console.error(err);}finally{setSaving(false);}}} disabled={saving}>{saving?'Guardando...':'Confirmar'}</button></div></>
          )}
        </div></div>
      )}
      {showMatchModal && (
        <div className="modal-overlay"><div className="modal">
          <div className="modal-header"><h3>{editMatchMode==='create'?'Nuevo Partido':'Editar Partido'}</h3><button className="close-btn" onClick={()=>setShowMatchModal(false)}><X size={20} /></button></div>
          <div className="modal-body"><div className="form-grid">
            <div className="form-group"><label>Local</label><select value={matchForm.homeTeamId} onChange={e=>setMatchForm(p=>({...p,homeTeamId:e.target.value}))}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="form-group"><label>Visitante</label><select value={matchForm.awayTeamId} onChange={e=>setMatchForm(p=>({...p,awayTeamId:e.target.value}))}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="form-group"><label>Fecha</label><input type="datetime-local" value={matchForm.matchDate} onChange={e=>setMatchForm(p=>({...p,matchDate:e.target.value}))} /></div>
            <div className="form-group"><label>País</label><select value={matchForm.countryId} onChange={e=>setMatchForm(p=>({...p,countryId:e.target.value,cityId:''}))}>{countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group full-width"><label>Ciudad</label><select value={matchForm.cityId} onChange={e=>setMatchForm(p=>({...p,cityId:e.target.value}))} disabled={cities.length===0}><option value="">Seleccionar</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div></div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowMatchModal(false)} disabled={saving}>Cancelar</button><button className="btn btn-primary" onClick={async()=>{try{setSaving(true);setError(null);const payload={...matchForm,matchDate:new Date(matchForm.matchDate).toISOString()};if(editMatchMode==='create'){await matchService.createMatch(payload);setSuccess('Partido creado');}else if(editingMatch){await matchService.updateMatch(editingMatch.id,payload);setSuccess('Partido actualizado');}setShowMatchModal(false);setTimeout(()=>setSuccess(null),3000);reloadList();}catch(err){setError('Error al guardar');console.error(err);}finally{setSaving(false);}}} disabled={saving}>{saving?'Guardando...':'Guardar'}</button></div>
        </div></div>
      )}
      {showDeleteConfirm && (
        <div className="modal-overlay"><div className="modal"><div className="modal-body confirm-body"><AlertTriangle size={48} className="warning-icon" /><h4>¿Estás seguro?</h4><p>Vas a eliminar <strong>{deletingMatch?.homeTeam.name} vs {deletingMatch?.awayTeam.name}</strong></p></div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowDeleteConfirm(false)} disabled={saving}>Cancelar</button><button className="btn btn-danger" onClick={async()=>{if(!deletingMatch)return;try{setSaving(true);setError(null);await matchService.deleteMatch(deletingMatch.id);setSuccess('Partido eliminado');setShowDeleteConfirm(false);setDeletingMatch(null);setTimeout(()=>setSuccess(null),3000);reloadList();}catch{setError('Error al eliminar');}finally{setSaving(false);}}} disabled={saving}>{saving?'Eliminando...':'Eliminar'}</button></div>
        </div></div>
      )}
    </div>
  );
};

export default Matches;