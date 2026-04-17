import { useState, useEffect, useCallback } from 'react';
import { cityService, type City } from '../../services/city.service';
import { countryService, type Country } from '../../services/country.service';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, MapPin } from 'lucide-react';
import './Cities.css';

const Cities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCity, setDeletingCity] = useState<City | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    countryId: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar lista de paises al inicio
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countryService.getCountries(undefined, 'name', false, 1, 100);
        setCountries(response.items);
        if (response.items.length > 0) {
          setSelectedCountryId(response.items[0].id);
          setFormData(prev => ({ ...prev, countryId: response.items[0].id }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCountries();
  }, []);

  const loadCities = useCallback(async (reset: boolean = false) => {
    if (loading || !selectedCountryId) return;
    
    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 1 : page;
      
      const response = await cityService.getCities(selectedCountryId, searchTerm, 'name', false, currentPage, 10);
      
      if (reset) {
        setCities(response.items);
        setPage(2);
      } else {
        setCities(prev => [...prev, ...response.items]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.hasNextPage);
    } catch (err) {
      setError('No se pudieron cargar las ciudades');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCountryId, searchTerm, page, loading]);

  useEffect(() => {
    if (selectedCountryId) {
      setCities([]);
      setPage(1);
      setHasMore(true);
      loadCities(true);
    }
  }, [selectedCountryId, searchTerm]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadCities();
    }
  };

  const openCreateModal = () => {
    setEditingCity(null);
    setFormData({
      name: '',
      countryId: selectedCountryId
    });
    setShowModal(true);
  };

  const openEditModal = (city: City) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      countryId: city.countryId
    });
    setShowModal(true);
  };

  const openDeleteModal = (city: City) => {
    setDeletingCity(city);
    setShowDeleteConfirm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingCity) {
        await cityService.updateCity({
          id: editingCity.id,
          name: formData.name,
          countryId: formData.countryId
        });
        setSuccess('Ciudad actualizada correctamente');
      } else {
        await cityService.createCity({
          name: formData.name,
          countryId: formData.countryId
        });
        setSuccess('Ciudad creada correctamente');
      }

      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setCities([]);
      setPage(1);
      setHasMore(true);
      loadCities(true);
      
    } catch (err) {
      setError('No se pudo guardar la ciudad. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCity) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await cityService.deleteCity(deletingCity.id);
      
      setSuccess('Ciudad eliminada correctamente');
      setShowDeleteConfirm(false);
      setDeletingCity(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setCities([]);
      setPage(1);
      setHasMore(true);
      loadCities(true);
      
    } catch (err) {
      setError('No se pudo eliminar la ciudad. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cities-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Ciudades</h1>
          <p>Administra las ciudades disponibles por país</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Nueva Ciudad
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>País</label>
          <select 
            value={selectedCountryId} 
            onChange={(e) => setSelectedCountryId(e.target.value)}
            className="country-select"
          >
            {countries.map(country => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Ciudades */}
      <div className="cities-container" onScroll={handleScroll}>
        <table className="cities-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>País</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cities.map(city => (
              <tr key={city.id}>
                <td className="city-name">
                  <MapPin size={16} className="city-icon" />
                  {city.name}
                </td>
                <td>{city.countryName}</td>
                <td className="actions">
                  <button className="icon-btn edit" onClick={() => openEditModal(city)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn delete" onClick={() => openDeleteModal(city)}>
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
            <span>Cargando más ciudades...</span>
          </div>
        )}

        {cities.length === 0 && !loading && (
          <div className="empty-state">
            <p>No se encontraron ciudades para este país</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingCity ? 'Editar Ciudad' : 'Nueva Ciudad'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre de la Ciudad</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Buenos Aires"
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
                Vas a eliminar la ciudad <strong>{deletingCity?.name}</strong>. 
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

export default Cities;