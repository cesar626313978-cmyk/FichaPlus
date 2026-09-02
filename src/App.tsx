import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DesktopNav } from './components/DesktopNav';
import { BottomNav } from './components/BottomNav';
import { PWAInstallModal } from './components/PWAInstallModal';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';
import { MonthlySignatureView } from './views/MonthlySignatureView';
import { RequestsView } from './views/RequestsView';
import { IncidentsView } from './views/IncidentsView';
import { AlarmsView } from './views/AlarmsView';
import { AuditView } from './views/AuditView';
import { CompanySettingsView } from './views/CompanySettingsView';
import { ProfileView } from './views/ProfileView';
import { NotificationsView } from './views/NotificationsView';
import { EmployeesView } from './views/EmployeesView';
import { ItssInspectionView } from './views/ItssInspectionView';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { profile, isAuthenticated } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'employees':
        if (!isAdmin) {
          return (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
              <p className="text-xs text-slate-500 mb-6">
                La gestión y alta de empleados está reservada para administradores y responsables de RRHH.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all"
              >
                Volver a Mi Fichaje
              </button>
            </div>
          );
        }
        return <EmployeesView />;
      case 'history':
        return <HistoryView />;
      case 'monthly_sign':
        return <MonthlySignatureView />;
      case 'requests':
        return <RequestsView />;
      case 'incidents':
        return <IncidentsView />;
      case 'alarms':
        return <AlarmsView />;
      case 'itss':
        if (!isAdmin) {
          return (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido ITSS</h2>
              <p className="text-xs text-slate-500 mb-6">
                El módulo de Inspección Laboral está reservado a la dirección y actuarios de la ITSS.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all"
              >
                Volver a Mi Fichaje
              </button>
            </div>
          );
        }
        return <ItssInspectionView />;
      case 'audit':
        if (!isAdmin) {
          return (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
              <p className="text-xs text-slate-500 mb-6">
                El módulo de Auditoría SHA-256 está reservado a administradores y responsables de RRHH.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all"
              >
                Volver a Mi Fichaje
              </button>
            </div>
          );
        }
        return <AuditView />;
      case 'settings':
        if (!isAdmin) {
          return (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Ajustes de Empresa</h2>
              <p className="text-xs text-slate-500 mb-6">
                La configuración fiscal, centros de trabajo y parámetros de empresa son de acceso exclusivo para RRHH.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all"
              >
                Volver a Mi Fichaje
              </button>
            </div>
          );
        }
        return <CompanySettingsView />;
      case 'profile':
        return <ProfileView />;
      case 'notifications':
        return <NotificationsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-indigo-500 selection:text-white text-slate-800">
      <Header />
      <div className="flex flex-1 max-w-[1440px] w-full mx-auto">
        <DesktopNav />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-12 overflow-x-hidden">
          {renderView()}
        </main>
      </div>
      <BottomNav />
      <PWAInstallModal />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
