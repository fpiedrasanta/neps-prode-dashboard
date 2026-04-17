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
  
  const [formData, setFormData] = useState({
    name: '',
    countryId: '',
    flagImage: null as File | null,
    flagPreview: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar lista de paises al inicio
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countryService.getCountries(undefined, 'name', false, 1, 100);
        setCountries(response.items);
        if (response.items.length > 0) {
          setFormData(prev => ({ ...prev, countryId: response.items[0].id }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCountries();
  }, []);

  const loadTeams = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 1 : page;
      
      const response = await teamService.getTeams(searchTerm, 'name', false, currentPage, 10);
      
      if (reset) {
        setTeams(response.items);
        setPage(2);
      } else {
        setTeams(prev => [...prev, ...response.items]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.hasNextPage);
    } catch (err) {
      setError('No se pudieron cargar los equipos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, loading]);

  useEffect(() => {
    setTeams([]);
    setPage(1);
    setHasMore(true);
    loadTeams(true);
  }, [searchTerm]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadTeams();
    }
  };

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      countryId: countries.length > 0 ? countries[0].id : '',
      flagImage: null,
      flagPreview: ''
    });
    setShowModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      countryId: team.countryId,
      flagImage: null,
      flagPreview: teamService.getFlagFullUrl(team.flagUrl)
    });
    setShowModal(true);
  };

  const openDeleteModal = (team: Team) => {
    setDeletingTeam(team);
    setShowDeleteConfirm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      flagImage: file,
      flagPreview: file ? URL.createObjectURL(file) : prev.flagPreview
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingTeam) {
        await teamService.updateTeam({
          id: editingTeam.id,
          name: formData.name,
          countryId: formData.countryId,
          flagImage: formData.flagImage
        });
        setSuccess('Equipo actualizado correctamente');
      } else {
        await teamService.createTeam({
          name: formData.name,
          countryId: formData.countryId,
          flagImage: formData.flagImage
        });
        setSuccess('Equipo creado correctamente');
      }

      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setTeams([]);
      setPage(1);
      setHasMore(true);
      loadTeams(true);
      
    } catch (err) {
      setError('No se pudo guardar el equipo. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await teamService.deleteTeam(deletingTeam.id);
      
      setSuccess('Equipo eliminado correctamente');
      setShowDeleteConfirm(false);
      setDeletingTeam(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setTeams([]);
      setPage(1);
      setHasMore(true);
      loadTeams(true);
      
    } catch (err) {
      setError('No se pudo eliminar el equipo. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teams-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Equipos</h1>
          <p>Administra los equipos/soccer teams</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo Equipo
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
            placeholder="Buscar equipo por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Equipos */}
      <div className="teams-container" onScroll={handleScroll}>
        <table className="teams-table">
          <thead>
            <tr>
              <th>Bandera</th>
              <th>Nombre</th>
              <th>País</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.id}>
                <td>
                  <img 
                    src={teamService.getFlagFullUrl(team.flagUrl)} 
                    alt={team.name} 
                    className="team-flag"
                  />
                </td>
                <td className="team-name">{team.name}</td>
                <td>{team.countryName}</td>
                <td className="actions">
                  <button className="icon-btn edit" onClick={() => openEditModal(team)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn delete" onClick={() => openDeleteModal(team)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="loading-more">
            <div className="spinner"></div>
            <span>Cargando más equipos...</span>
          </div>
        )}

        {teams.length === 0 && !loading && (
          <div className="empty-state">
            <p>No se encontraron equipos</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal country-modal">
            <div className="modal-header">
              <h3>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del Equipo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Argentina"
                  />
                </div>

                <div className="form-group">
                  <label>País</label>
                  <select
                    value={formData.countryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, countryId: e.target.value }))}
                  >
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Bandera</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden-input"
                  />
                  <div className="file-upload" onClick={() => fileInputRef.current?.click()}>
                    {formData.flagPreview ? (
                      <img src={formData.flagPreview} alt="Preview" className="flag-preview" />
                    ) : (
                      <>
                        <Users size={24} />
                        <span>Haz clic para seleccionar imagen</span>
                      </>
                    )}
                  </div>
                </div>
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
                Vas a eliminar el equipo <strong>{deletingTeam?.name}</strong>. 
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

export default Teams;