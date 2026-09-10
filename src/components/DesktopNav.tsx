import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  highlight?: boolean;
  badge?: string;
}

export const DesktopNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { profile, switchRole, signOut } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const employeeNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Mi Terminal de Fichaje', icon: 'timer' },
    { id: 'history', label: 'Mi Historial de Fichajes', icon: 'calendar_month' },
    { id: 'requests', label: 'Mis Vacaciones y Permisos', icon: 'flight_takeoff' },
    { id: 'monthly_sign', label: 'Mi Firma Mensual (Art. 34.9)', icon: 'draw', highlight: true },
    { id: 'incidents', label: 'Subsanar Mis Incidencias', icon: 'report_problem' },
    { id: 'alarms', label: 'Mis Alarmas y Avisos', icon: 'alarm' },
    { id: 'profile', label: 'Mi Perfil Laboral', icon: 'badge' },
  ];

  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel General RRHH', icon: 'dashboard' },
    { id: 'employees', label: 'Gestión de Plantilla', icon: 'group', highlight: true, badge: 'RRHH' },
    { id: 'history', label: 'Registro de Jornadas (Todos)', icon: 'calendar_month' },
    { id: 'requests', label: 'Gestión de Permisos', icon: 'rule' },
    { id: 'monthly_sign', label: 'Firmas de la Plantilla', icon: 'draw', highlight: true },
    { id: 'incidents', label: 'Validar Incidencias', icon: 'fact_check' },
    { id: 'itss', label: 'Portal Inspección ITSS', icon: 'gavel', highlight: true, badge: 'LEGAL' },
    { id: 'audit', label: 'Auditoría Legal SHA-256', icon: 'verified_user' },
    { id: 'settings', label: 'Ajustes de Empresa', icon: 'tune' },
    { id: 'alarms', label: 'Avisos & Alarmas', icon: 'alarm' },
    { id: 'profile', label: 'Mi Perfil', icon: 'badge' },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-72 h-[calc(100vh-4.25rem)] sticky top-[4.25rem] bg-white border-r border-slate-200 shadow-xs p-5 shrink-0 overflow-y-auto">
      {/* User Info Card */}
      <div className={`rounded-3xl p-4 text-white shadow-md mb-5 transition-all ${
        isAdmin 
          ? 'bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 shadow-purple-100'
          : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 shadow-indigo-100'
      }`}>
        <div className="flex items-center gap-3">
          <UserAvatar
            name={profile.name}
            size="lg"
            rounded="2xl"
            showBorder
            borderColor="border-white/30"
          />
          <div className="overflow-hidden">
            <h3 className="font-bold text-sm text-white truncate">{profile.name}</h3>
            <p className="text-xs text-indigo-100/80 truncate">{profile.email}</p>
            <span className={`inline-block mt-1 px-2.5 py-0.5 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider rounded-full ${
              isAdmin ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/20 text-white'
            }`}>
              {isAdmin ? 'Superusuario RRHH' : 'Empleado'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Title */}
      <div className="px-2 mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {isAdmin ? 'Menú de Administración' : 'Menú del Trabajador'}
        </span>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
          {isAdmin ? 'ADMIN' : 'USUARIO'}
        </span>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-1.5 flex-grow">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs font-bold border border-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate flex-1 font-bold">{item.label}</span>
              
              {item.badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-xs">
                  {item.badge}
                </span>
              )}

              {item.highlight && !item.badge && !isActive && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Role Switcher Demo Bar & Logout (Sticky at bottom) */}
      <div className="pt-4 border-t border-slate-100 mt-auto space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Modo de Prueba (Roles):
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                switchRole('employee');
                if (['employees', 'settings', 'itss', 'audit'].includes(activeTab)) {
                  setActiveTab('dashboard');
                }
              }}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                !isAdmin
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Empleado
            </button>
            <button
              onClick={() => {
                switchRole('admin');
              }}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admin / RRHH
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
