import { useState, useEffect, useCallback, useRef } from 'react';
import { countryService, type Country } from '../../services/country.service';
import { Search, Plus, Edit2, Trash2, X, Upload, AlertTriangle } from 'lucide-react';
import './Countries.css';

const Countries = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    isoCode: '',
    isoCode2: '',
    flagImage: null as File | null,
    flagPreview: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCountries = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 1 : page;
      
      const response = await countryService.getCountries(searchTerm, 'name', false, currentPage, 10);
      
      if (reset) {
        setCountries(response.items);
        setPage(2);
      } else {
        setCountries(prev => [...prev, ...response.items]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.hasNextPage);
    } catch (err) {
      setError('No se pudieron cargar los países');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, loading]);

  useEffect(() => {
    setCountries([]);
    setPage(1);
    setHasMore(true);
    loadCountries(true);
  }, [searchTerm]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      loadCountries();
    }
  };

  const openCreateModal = () => {
    setEditingCountry(null);
    setFormData({
      name: '',
      isoCode: '',
      isoCode2: '',
      flagImage: null,
      flagPreview: ''
    });
    setShowModal(true);
  };

  const openEditModal = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      isoCode: country.isoCode,
      isoCode2: country.isoCode2 || '',
      flagImage: null,
      flagPreview: countryService.getFlagFullUrl(country.flagUrl)
    });
    setShowModal(true);
  };

  const openDeleteModal = (country: Country) => {
    setDeletingCountry(country);
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

      if (editingCountry) {
        await countryService.updateCountry({
          id: editingCountry.id,
          name: formData.name,
          isoCode: formData.isoCode,
          isoCode2: formData.isoCode2 || undefined,
          flagImage: formData.flagImage
        });
        setSuccess('País actualizado correctamente');
      } else {
        await countryService.createCountry({
          name: formData.name,
          isoCode: formData.isoCode,
          isoCode2: formData.isoCode2 || undefined,
          flagImage: formData.flagImage
        });
        setSuccess('País creado correctamente');
      }

      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setCountries([]);
      setPage(1);
      setHasMore(true);
      loadCountries(true);
      
    } catch (err) {
      setError('No se pudo guardar el país. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCountry) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await countryService.deleteCountry(deletingCountry.id);
      
      setSuccess('País eliminado correctamente');
      setShowDeleteConfirm(false);
      setDeletingCountry(null);
      setTimeout(() => setSuccess(null), 3000);
      
      // Recargar lista
      setCountries([]);
      setPage(1);
      setHasMore(true);
      loadCountries(true);
      
    } catch (err) {
      setError('No se pudo eliminar el país. Intentá nuevamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="countries-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Países</h1>
          <p>Administra los paises disponibles del sistema</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo País
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
            placeholder="Buscar país por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Paises */}
      <div className="countries-container" onScroll={handleScroll}>
        <table className="countries-table">
          <thead>
            <tr>
              <th>Bandera</th>
              <th>Nombre</th>
              <th>Código ISO</th>
              <th>Código ISO 2</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {countries.map(country => (
              <tr key={country.id}>
                <td>
                  <img 
                    src={countryService.getFlagFullUrl(country.flagUrl)} 
                    alt={country.name} 
                    className="country-flag"
                  />
                </td>
                <td className="country-name">{country.name}</td>
                <td>{country.isoCode}</td>
                <td>{country.isoCode2 || '-'}</td>
                <td className="actions">
                  <button className="icon-btn edit" onClick={() => openEditModal(country)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn delete" onClick={() => openDeleteModal(country)}>
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
            <span>Cargando más paises...</span>
          </div>
        )}

        {countries.length === 0 && !loading && (
          <div className="empty-state">
            <p>No se encontraron paises</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal country-modal">
            <div className="modal-header">
              <h3>{editingCountry ? 'Editar País' : 'Nuevo País'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del País</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Argentina"
                  />
                </div>

                <div className="form-group">
                  <label>Código ISO</label>
                  <input
                    type="text"
                    value={formData.isoCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, isoCode: e.target.value.toUpperCase() }))}
                    placeholder="Ej: ARG"
                    maxLength={5}
                  />
                </div>

                <div className="form-group">
                  <label>Código ISO 2</label>
                  <input
                    type="text"
                    value={formData.isoCode2}
                    onChange={(e) => setFormData(prev => ({ ...prev, isoCode2: e.target.value.toUpperCase() }))}
                    placeholder="Ej: AR"
                    maxLength={3}
                  />
                </div>

                <div className="form-group">
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
                        <Upload size={24} />
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
                Vas a eliminar el país <strong>{deletingCountry?.name}</strong>. 
                Esta acción no se puede deshacer.
              </p>
              <p className="warning-text">Se eliminaran todos los datos relacionados.</p>
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

export default Countries;