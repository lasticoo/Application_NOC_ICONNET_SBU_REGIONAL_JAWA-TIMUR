import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage     from './pages/LoginPage';
import Layout        from './pages/Layout';
import DashboardPage from './pages/DashboardPage';
import DevicesPage   from './pages/DevicesPage';
import ButtonsPage   from './pages/ButtonsPage';
import UsersPage     from './pages/UsersPage';
import ActivityPage  from './pages/ActivityPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index            element={<DashboardPage />} />
            <Route path="devices"   element={<DevicesPage />} />
            <Route path="buttons"   element={<ButtonsPage />} />
            <Route path="users"     element={<UsersPage />} />
            <Route path="activity"  element={<ActivityPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
