import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const employeeItems = [
    { id: 'dashboard', label: 'Fichar', icon: 'timer' },
    { id: 'history', label: 'Historial', icon: 'calendar_month' },
    { id: 'requests', label: 'Vacaciones', icon: 'flight_takeoff' },
    { id: 'monthly_sign', label: 'Firma', icon: 'draw' },
    { id: 'alarms', label: 'Alarmas', icon: 'alarm' },
  ];

  const adminItems = [
    { id: 'dashboard', label: 'Panel', icon: 'dashboard' },
    { id: 'employees', label: 'Empleados', icon: 'badge' },
    { id: 'history', label: 'Registros', icon: 'calendar_month' },
    { id: 'requests', label: 'Permisos', icon: 'rule' },
    { id: 'settings', label: 'Ajustes', icon: 'settings' },
  ];

  const items = isAdmin ? adminItems : employeeItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 h-18 flex justify-around items-center px-3 pb-safe shadow-lg">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center transition-all px-3 py-1.5 rounded-2xl ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
