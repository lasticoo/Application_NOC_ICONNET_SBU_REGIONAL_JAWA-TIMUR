import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Server, MousePointerClick,
  Users, Activity, LogOut
} from 'lucide-react';

const navItems = [
  { to: '/',        label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/devices', label: 'Perangkat OLT', icon: Server },
  { to: '/buttons', label: 'Kelola Button', icon: MousePointerClick },
  { to: '/users',   label: 'Pengguna',      icon: Users },
  { to: '/activity',label: 'Aktivitas',     icon: Activity },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="font-bold text-lg">NOC System</h1>
          <p className="text-gray-400 text-xs mt-1">{user?.fullName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors
                 ${isActive
                   ? 'bg-blue-600 text-white'
                   : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                 }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2 p-6 text-gray-400 hover:text-white text-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
