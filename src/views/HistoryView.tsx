import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const HistoryView: React.FC = () => {
  const { timeEntries, employees, setActiveTab } = useApp();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin' || profile.role === 'manager';

  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('all');

  // Filter entries
  const filteredEntries = timeEntries.filter((entry) => {
    if (!isAdmin && entry.userId && entry.userId !== profile.id && entry.userName !== profile.name) return false;
    if (isAdmin && selectedEmployeeId !== 'all' && entry.userId !== selectedEmployeeId) return false;
    if (selectedWorkType !== 'all' && entry.workType !== selectedWorkType) return false;
    if (selectedMonth && entry.date && !entry.date.startsWith(selectedMonth)) return false;
    return true;
  });

  const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.totalHoursWorked || 0), 0);
  const totalBreaks = filteredEntries.reduce((acc, curr) => acc + (curr.breakDurationMinutes || 0), 0);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isAdmin ? 'Registro General de Plantilla' : 'Mi Historial Laboral'}
            </span>
          </div>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            {isAdmin ? 'Control de Jornadas de la Plantilla' : 'Mi Historial de Fichajes'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Supervisa, audita y exporta los registros horarios de todos los trabajadores de la empresa.'
              : 'Consulta tus entradas, salidas, descansos y geolocalización registrada conforme a ley.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {!isAdmin ? (
            <button
              onClick={() => setActiveTab('monthly_sign')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">draw</span>
              <span>Firmar Mes</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('itss')}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 py-2 px-3.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base font-bold">gavel</span>
                <span>Inspección ITSS</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">verified_user</span>
                <span>Auditoría SHA-256</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Filters & Quick Selectors */}
      {isAdmin && (
        <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Employee Selector */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Filtrar por Empleado:
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">👥 Toda la Plantilla ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Work Modality Selector */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Modalidad:
              </label>
              <select
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Todas las Modalidades</option>
                <option value="presencial">🏢 Presencial</option>
                <option value="teletrabajo">🏠 Teletrabajo</option>
                <option value="cliente">🚗 Cliente</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Horas Totales</span>
              <span className="font-black text-lg text-indigo-600">{totalHours.toFixed(1)}h</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Pausas Acumuladas</span>
              <span className="font-black text-lg text-slate-700">{totalBreaks}m</span>
            </div>
          </div>
        </section>
      )}

      {/* Entries Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {isAdmin ? 'Registros Detallados de Jornada' : 'Mis Registros Diarios'}
            </h3>
            <p className="text-xs text-slate-400">
              Total: {filteredEntries.length} jornadas computadas en el periodo seleccionado
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Trazabilidad SHA-256 Activa</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                {isAdmin && <th className="px-6 py-3.5">Trabajador</th>}
                <th className="px-6 py-3.5">Día</th>
                <th className="px-6 py-3.5">Planificación</th>
                <th className="px-6 py-3.5">Detalle Turnos</th>
                <th className="px-6 py-3.5">Pausa</th>
                <th className="px-6 py-3.5">Total Jornada</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEntries.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {row.userName ? row.userName.slice(0, 2).toUpperCase() : profile.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{row.userName || profile.name}</span>
                          <span className="text-[10px] text-slate-400">{profile.department}</span>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800 block">{row.date}</span>
                    {row.location?.lat ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono mt-0.5"
                        title={`Precisión ±${row.location.accuracy || 5}m - ${row.location.address || 'GPS Verificado'}`}
                      >
                        <span className="material-symbols-outlined text-xs text-emerald-600">location_on</span>
                        <span>{row.location.lat.toFixed(3)}°, {row.location.lng.toFixed(3)}°</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>Fichaje Certificado</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 w-fit text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md ${
                          row.workType === 'presencial'
                            ? 'bg-indigo-50 text-indigo-700'
                            : row.workType === 'teletrabajo'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.workType === 'presencial' ? '🏢 Presencial' : row.workType === 'teletrabajo' ? '🏠 Teletrabajo' : '🚗 Cliente'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {row.workdayPlan === 'partida' ? '🌗 2 Turnos (Partida)' : '☀️ Turno Continuo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {row.workdayPlan === 'partida' || row.shift2ClockIn ? (
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1 rounded">T1</span>
                          <span className="text-emerald-600 font-bold">{row.shift1ClockIn || row.clockIn}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-rose-500 font-bold">{row.shift1ClockOut || '14:00'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1 rounded">T2</span>
                          <span className="text-emerald-600 font-bold">{row.shift2ClockIn || '16:00'}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-rose-500 font-bold">{row.shift2ClockOut || row.clockOut || '--:--'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-emerald-600 font-bold">{row.clockIn}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-rose-500 font-bold">{row.clockOut || '--:--'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{row.breakDurationMinutes || 0}m</td>
                  <td className="px-6 py-4 font-black text-slate-900 text-sm">{row.totalHoursWorked}h</td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin ? (
                      <button
                        onClick={() => setActiveTab('incidents')}
                        className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Validar
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('incidents')}
                        className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Subsanar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
