import { useState, useEffect, useCallback } from 'react';
import { matchService, type Match, type MatchResultPayload } from '../../services/match.service';
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
  const [matchForm, setMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    matchDate: '',
    cityId: '',
    countryId: ''
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMatches = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 1 : page;
      
      const response = await matchService.getMatches(statusFilter, searchTerm, currentPage, 10);
      
      if (reset) {
        setMatches(response.items);
        setPage(2);
      } else {
        setMatches(prev => [...prev, ...response.items]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.items.length === 10 && matches.length + response.items.length < response.totalCount);
    } catch (err) {
      setError('No se pudieron cargar los partidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, page, loading, matches.length]);

  // Cargar listas maestras al inicio (SIN PAGINADO - trae TODO)
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [countriesRes, teamsRes] = await Promise.all([
          countryService.getCountries(undefined, 'name', false, 1, 9999),
          teamService.getTeams(undefined, 'name', false, 1, 9999)
        ]);
        setCountries(countriesRes.items);
        setTeams(teamsRes.items);
      } catch (err) {
        console.error(err);
      }
    };
    loadMasterData();
  }, []);

  // Cargar ciudades cuando se selecciona pais (SIN PAGINADO - trae TODO)
  useEffect(() => {
    if (matchForm.countryId) {
      cityService.getCities(matchForm.countryId, undefined, 'name', false, 1, 9999)
        .then(res => setCities(res.items))
        .catch(err => console.error(err));
    } else {
      setCities([]);
    }
  }, [matchForm.countryId]);

  useEffect(() => {
    setMatches([]);
    setPage(1);
    setHasMore(true);
    loadMatches(true);
  }, [statusFilter, searchTerm]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadMatches();
    }
  };

  const openResultModal = (match: Match) => {
    setEditingMatch(match);
    setResultForm({
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0
    });
    setShowConfirmResultModal(false);
    setShowResultModal(true);
  };

  const handleSaveResult = () => {
    setShowConfirmResultModal(true);
  };

  const openCreateMatchModal = () => {
    setEditMatchMode('create');
    setMatchForm({
      homeTeamId: teams.length > 0 ? teams[0].id : '',
      awayTeamId: teams.length > 1 ? teams[1].id : '',
      matchDate: new Date().toISOString().slice(0, 16),
      cityId: '',
      countryId: countries.length > 0 ? countries[0].id : ''
    });
    setShowMatchModal(true);
  };

  const openEditMatchModal = (match: Match) => {
    setEditMatchMode('edit');
    setEditingMatch(match);
    setMatchForm({
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
      matchDate: new Date(match.matchDate).toISOString().slice(0, 16),
      cityId: match.city.id,
      countryId: match.country.id
    });
    setShowMatchModal(true);
  };

  const openDeleteModal = (match: Match) => {
    setDeletingMatch(match);
    setShowDeleteConfirm(true);
  };

  const handleSaveMatch = async () => {
    try {
      setSaving(true);
      setError(null);

      // Convertir fecha a formato ISO String correcto
      const payload = {
        ...matchForm,
        matchDate: new Date(matchForm.matchDate).toISOString()
      };

      console.log('📅 Fecha original:', matchForm.matchDate);
      console.log('✅ Fecha convertida a ISO:', payload.matchDate);
      
      if (editMatchMode === 'create') {
        await matchService.createMatch(payload);
        setSuccess('Partido creado correctamente');
      } else if (editingMatch) {
        await matchService.updateMatch(editingMatch.id, payload);
        setSuccess('Partido actualizado correctamente');
      }

      setShowMatchModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setMatches([]);
      setPage(1);
      setHasMore(true);
      loadMatches(true);
      
    } catch (err) {
      setError('No se pudo guardar el partido. Intentรก nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!deletingMatch) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await matchService.deleteMatch(deletingMatch.id);
      
      setSuccess('Partido eliminado correctamente');
      setShowDeleteConfirm(false);
      setDeletingMatch(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setMatches([]);
      setPage(1);
      setHasMore(true);
      loadMatches(true);
      
    } catch (err) {
      setError('No se pudo eliminar el partido. Intentรก nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmSaveResult = async () => {
    if (!editingMatch) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const payload: MatchResultPayload = {
        homeScore: resultForm.homeScore,
        awayScore: resultForm.awayScore
      };
      
      await matchService.updateMatchResult(editingMatch.id, payload);
      
      // Actualizar el partido en la lista local
      setMatches(prev => prev.map(m => 
        m.id === editingMatch.id 
          ? { ...m, ...payload, status: 3 as const } 
          : m
      ));
      
      setSuccess('Resultado guardado correctamente! Los puntos ya fueron calculados.');
      setTimeout(() => setSuccess(null), 3000);
      
      setEditingMatch(null);
      setShowResultModal(false);
      setShowConfirmResultModal(false);
    } catch (err) {
      setError('No se pudo guardar el resultado. Intentรก nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const statuses = {
      1: { label: 'Prรณximo', class: 'status-upcoming' },
      2: { label: 'En Juego', class: 'status-live' },
      3: { label: 'Finalizado', class: 'status-finished' }
    };
    return statuses[status as keyof typeof statuses] || statuses[1];
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

  const getFlagImage = (flagUrl: string) => {
    if (!flagUrl) return '';
    if (flagUrl.startsWith('http')) return flagUrl;
    return `${API_CONFIG.CDN_URL}${flagUrl}`;
  };

  return (
    <div className="matches-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Partidos</h1>
          <p>Administra los partidos del sistema y carga sus resultados</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openCreateMatchModal}>
          <Plus size={18} />
          Nuevo Partido
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filtros */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filters">
          <button 
            className={`filter-btn ${statusFilter === 1 ? 'active' : ''}`}
            onClick={() => setStatusFilter(1)}
          >
            Próximos
          </button>
          <button 
            className={`filter-btn ${statusFilter === 2 ? 'active' : ''}`}
            onClick={() => setStatusFilter(2)}
          >
            En Juego
          </button>
          <button 
            className={`filter-btn ${statusFilter === 3 ? 'active' : ''}`}
            onClick={() => setStatusFilter(3)}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Lista de Partidos */}
      <div className="matches-container" onScroll={handleScroll}>
        {matches.length === 0 && !loading ? (
          <div className="empty-state">
            <p>No se encontraron partidos</p>
          </div>
        ) : (
          <>
            {matches.map(match => (
              <div key={match.id} className={`match-card ${match.status === 3 ? 'finished' : ''}`}>
                <div className="match-header">
                  <span className={`status-badge ${getStatusBadge(match.status).class}`}>
                    {getStatusBadge(match.status).label}
                  </span>
                  <span className="match-date">{formatDate(match.matchDate)}</span>
                  
                  <div className="card-actions">
                    {match.status === 1 && (
                      <>
                        <button 
                          className="icon-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditMatchModal(match);
                          }}
                          title="Editar partido"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="icon-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(match);
                          }}
                          title="Eliminar partido"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}

                    {match.status === 2 && (
                      <button 
                        className="icon-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openResultModal(match);
                        }}
                        title="Cargar resultado"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="match-teams">
                  <div className="team">
                    <div className="team-header">
                      <img src={getFlagImage(match.homeTeam.flagUrl)} alt={match.homeTeam.name} className="team-flag" />
                      <span className="team-name">{match.homeTeam.name}</span>
                    </div>
                    <span className="score">{match.homeScore ?? '-'}</span>
                  </div>

                  <span className="separator">VS</span>

                  <div className="team">
                    <div className="team-header">
                      <span className="team-name">{match.awayTeam.name}</span>
                      <img src={getFlagImage(match.awayTeam.flagUrl)} alt={match.awayTeam.name} className="team-flag" />
                    </div>
                    <span className="score">{match.awayScore ?? '-'}</span>
                  </div>
                </div>

                  <div className="match-footer">
                    {match.group && <span className="group-tag">Grupo {match.group}</span>}
                    <span className="city">{match.city.name}, {match.country.name}</span>
                  </div>
              </div>
            ))}

            {loading && (
              <div className="loading-more">
                <div className="spinner"></div>
                <span>Cargando mรกs partidos...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Cargar Resultado */}
      {showResultModal && editingMatch && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Cargar Resultado</h3>
              <button className="close-btn" onClick={() => setEditingMatch(null)}>
                <X size={20} />
              </button>
            </div>

            {!showConfirmResultModal ? (
              <>
                <div className="modal-body">
                  <div className="result-form">
                    <div className="form-team">
                      <label>{editingMatch.homeTeam.name}</label>
                      <input
                        type="number"
                        min="0"
                        value={resultForm.homeScore}
                        onChange={(e) => setResultForm(prev => ({
                          ...prev,
                          homeScore: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>

                    <span className="form-separator">-</span>

                    <div className="form-team">
                      <label>{editingMatch.awayTeam.name}</label>
                      <input
                        type="number"
                        min="0"
                        value={resultForm.awayScore}
                        onChange={(e) => setResultForm(prev => ({
                          ...prev,
                          awayScore: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowResultModal(false)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveResult}>
                    Guardar Resultado
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body confirm-body">
                  <AlertTriangle size={48} className="warning-icon" />
                  <h4>ยฟEstรกs seguro?</h4>
                  <p>
                    Una vez que guardes este resultado, el partido se marcarรก como <strong>Finalizado</strong> 
                    y se calcularรกn automรกticamente los puntos para todos los usuarios.
                  </p>
                  <p className="warning-text">Esta acciรณn no se puede deshacer.</p>
                  
                  <div className="confirm-result">
                    <strong>{editingMatch.homeTeam.name} {resultForm.homeScore}</strong>
                    <span> - </span>
                    <strong>{resultForm.awayScore} {editingMatch.awayTeam.name}</strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowConfirmResultModal(false)}
                    disabled={saving}
                  >
                    Volver
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={confirmSaveResult}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Confirmar y Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Partido */}
      {showMatchModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editMatchMode === 'create' ? 'Nuevo Partido' : 'Editar Partido'}</h3>
              <button className="close-btn" onClick={() => setShowMatchModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Equipo Local</label>
                  <select
                    value={matchForm.homeTeamId}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, homeTeamId: e.target.value }))}
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Equipo Visitante</label>
                  <select
                    value={matchForm.awayTeamId}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, awayTeamId: e.target.value }))}
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    value={matchForm.matchDate}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, matchDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>País</label>
                  <select
                    value={matchForm.countryId}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, countryId: e.target.value, cityId: '' }))}
                  >
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Ciudad</label>
                  <select
                    value={matchForm.cityId}
                    onChange={(e) => setMatchForm(prev => ({ ...prev, cityId: e.target.value }))}
                    disabled={cities.length === 0}
                  >
                    <option value="">Seleccionar ciudad</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMatchModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveMatch} disabled={saving}>
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
                Vas a eliminar el partido <strong>{deletingMatch?.homeTeam.name} vs {deletingMatch?.awayTeam.name}</strong>. 
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
                onClick={handleDeleteMatch}
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

export default Matches;
