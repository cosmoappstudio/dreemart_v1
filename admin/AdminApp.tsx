import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Palette, FileText, Cpu, Key, Scale, LogOut, Menu, X, Moon, ImageIcon, CreditCard, Settings, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminRoute, ADMIN_PATH } from '../lib/adminPath';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminArtists from './AdminArtists';
import AdminPrompts from './AdminPrompts';
import AdminReplicate from './AdminReplicate';
import AdminKeys from './AdminKeys';
import AdminLegal from './AdminLegal';
import AdminLanding from './AdminLanding';
import AdminPricing from './AdminPricing';
import AdminSite from './AdminSite';
import AdminSales from './AdminSales';

const ROUTE_KEYS: { key: string; label: string; icon: typeof LayoutDashboard }[] = [
  { key: '', label: 'Dashboard', icon: LayoutDashboard },
  { key: '/sales', label: 'Satış & Gelir', icon: DollarSign },
  { key: '/users', label: 'Kullanıcılar', icon: Users },
  { key: '/artists', label: 'Ressamlar', icon: Palette },
  { key: '/landing', label: 'Örnek Rüyalar', icon: ImageIcon },
  { key: '/pricing', label: 'Kredi Paketleri', icon: CreditCard },
  { key: '/prompts', label: 'Promptlar', icon: FileText },
  { key: '/replicate', label: 'Replicate', icon: Cpu },
  { key: '/keys', label: 'API & Anahtarlar', icon: Key },
  { key: '/legal', label: 'Yasal Sayfalar', icon: Scale },
  { key: '/site', label: 'Site Ayarları', icon: Settings },
];

function Breadcrumb() {
  const loc = useLocation();
  const base = `/${ADMIN_PATH}`;
  const current = ROUTE_KEYS.find((r) => r.key === '' ? loc.pathname === base : loc.pathname.startsWith(`${base}${r.key}`)) ?? ROUTE_KEYS[0];
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
      <span>Admin</span>
      <span>/</span>
      <span className="text-white font-medium">{current.label}</span>
    </nav>
  );
}

export default function AdminApp() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">Dreemart</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-2 py-3 text-xs text-gray-500 uppercase tracking-wider">Admin Panel</div>
        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          {ROUTE_KEYS.map(({ key, label, icon: Icon }) => {
            const path = adminRoute(key ? `/admin${key}` : '/admin');
            return (
              <NavLink
                key={path}
                to={path}
                end={key === ''}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-2 text-xs text-gray-500 truncate" title={profile?.email ?? ''}>
            {profile?.email ?? 'Admin'}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-gray-950/80 backdrop-blur border-b border-gray-800 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white"
            aria-label="Menüyü aç"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Breadcrumb />
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="artists" element={<AdminArtists />} />
            <Route path="prompts" element={<AdminPrompts />} />
            <Route path="replicate" element={<AdminReplicate />} />
            <Route path="keys" element={<AdminKeys />} />
            <Route path="legal" element={<AdminLegal />} />
            <Route path="landing" element={<AdminLanding />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="site" element={<AdminSite />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
