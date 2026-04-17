import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';

// Páginas del Dashboard
const DashboardHome = () => <h2>Bienvenido al Panel de Administración</h2>;
const Estadisticas = () => <h2>Estadísticas</h2>;
const Usuarios = () => <h2>Gestión de Usuarios</h2>;
const Configuracion = () => <h2>Configuración</h2>;
import Matches from './pages/dashboard/Matches';
import Countries from './pages/dashboard/Countries';
import Cities from './pages/dashboard/Cities';
import Teams from './pages/dashboard/Teams';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="paises" element={<Countries />} />
            <Route path="ciudades" element={<Cities />} />
            <Route path="equipos" element={<Teams />} />
            <Route path="partidos" element={<Matches />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;