import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Home, Settings, Users, BarChart3, Trophy, Globe, MapPin, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Home, label: 'Inicio', path: '/dashboard' },
    { icon: Globe, label: 'Paises', path: '/dashboard/paises' },
    { icon: MapPin, label: 'Ciudades', path: '/dashboard/ciudades' },
    { icon: Shield, label: 'Equipos', path: '/dashboard/equipos' },
    { icon: Trophy, label: 'Partidos', path: '/dashboard/partidos' },
    { icon: BarChart3, label: 'Estadísticas', path: '/dashboard/estadisticas' },
    { icon: Users, label: 'Usuarios', path: '/dashboard/usuarios' },
    { icon: Settings, label: 'Configuración', path: '/dashboard/configuracion' },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Neps Prode</h2>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <a key={item.path} href={item.path} className="menu-item">
              <item.icon size={20} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="header-title">
            <h1>Dashboard</h1>
          </div>

          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="content-area">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>Desarrollado por neps. Licencia MIT.</p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;