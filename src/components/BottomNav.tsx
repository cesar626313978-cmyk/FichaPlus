import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  isRoleSwitch?: boolean;
  targetRole?: 'admin' | 'employee';
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { profile, switchRole, isActualAdmin } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  // Standard items for normal employees
  const standardEmployeeItems: NavItem[] = [
    { id: 'dashboard', label: 'Fichar', icon: 'timer' },
    { id: 'history', label: 'Historial', icon: 'calendar_month' },
    { id: 'incidents', label: 'Incidencias', icon: 'edit_note' },
    { id: 'requests', label: 'Vacaciones', icon: 'flight_takeoff' },
    { id: 'monthly_sign', label: 'Firma', icon: 'draw' },
  ];

  // Employee view for Administrator (includes direct toggle back to Admin mode)
  const adminAsEmployeeItems: NavItem[] = [
    { id: 'dashboard', label: 'Fichar', icon: 'timer' },
    { id: 'history', label: 'Historial', icon: 'calendar_month' },
    { id: 'requests', label: 'Vacaciones', icon: 'flight_takeoff' },
    { id: 'monthly_sign', label: 'Firma', icon: 'draw' },
    { id: 'role_switch_admin', label: 'Ir a Admin', icon: 'admin_panel_settings', isRoleSwitch: true, targetRole: 'admin' },
  ];

  // Admin view for Administrator (includes direct toggle to Employee clock-in role)
  const adminItems: NavItem[] = [
    { id: 'dashboard', label: 'Panel', icon: 'dashboard' },
    { id: 'employees', label: 'Plantilla', icon: 'group' },
    { id: 'history', label: 'Registros', icon: 'calendar_month' },
    { id: 'requests', label: 'Permisos', icon: 'rule' },
    { id: 'role_switch_emp', label: 'Mi Fichaje', icon: 'timer', isRoleSwitch: true, targetRole: 'employee' },
  ];

  const items: NavItem[] = isActualAdmin
    ? isAdmin
      ? adminItems
      : adminAsEmployeeItems
    : standardEmployeeItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 h-18 flex justify-around items-center px-3 pb-safe shadow-lg">
      {items.map((item) => {
        const isActive = !item.isRoleSwitch && activeTab === item.id;
        const isSwitch = item.isRoleSwitch;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (isSwitch && item.targetRole) {
                switchRole(item.targetRole);
                setActiveTab('dashboard');
              } else {
                setActiveTab(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl cursor-pointer ${
              isSwitch
                ? item.targetRole === 'admin'
                  ? 'text-indigo-600 hover:bg-indigo-50 font-bold'
                  : 'text-emerald-600 hover:bg-emerald-50 font-bold'
                : isActive
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${isSwitch ? 'scale-110' : ''}`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] tracking-tight mt-0.5 font-semibold">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
