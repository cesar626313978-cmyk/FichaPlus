import React, { useState, useMemo } from 'react';
import { EmployeeRecord, TimeOffRequest, CompanySettings } from '../types';
import {
  computeEmployeeVacationAudit,
  analyzeSingleVacationRequest,
  VacationPeriodAnalysis,
} from '../utils/vacationWeekendUtils';
import { getEffectiveSaturdayPlan } from '../utils/shiftUtils';

interface PrintableVacationStaffCalendarProps {
  employees: EmployeeRecord[];
  timeOffRequests: TimeOffRequest[];
  companySettings?: CompanySettings;
  onSelectEmployeeToPlan?: (empId: string) => void;
  onOpenAuditor?: (empId?: string) => void;
  onEditRequest?: (req: TimeOffRequest) => void;
  onOpenManager?: () => void;
}

export type ViewMode = 'print_sheet' | 'matrix' | 'monthly_calendar';

interface EmployeeStaffVacationSummary {
  employee: EmployeeRecord;
  allocatedDays: number;
  enjoyedDays: number; // Disfrutadas (fecha pasada)
  scheduledDays: number; // Previstas (fecha futura aprobada)
  pendingDays: number; // Pendientes de aprobación
  remainingDays: number; // Saldo
  fullWeekendsCount: number;
  workingSaturdaysCount: number;
  offSaturdaysCount: number;
  isRuleSatisfied: boolean;
  periods: {
    analysis: VacationPeriodAnalysis;
    classification: 'DISFRUTADA' | 'PREVISTA' | 'PENDIENTE';
  }[];
}

const MONTHS_ES = [
  { index: 0, name: 'Enero', short: 'Ene' },
  { index: 1, name: 'Febrero', short: 'Feb' },
  { index: 2, name: 'Marzo', short: 'Mar' },
  { index: 3, name: 'Abril', short: 'Abr' },
  { index: 4, name: 'Mayo', short: 'May' },
  { index: 5, name: 'Junio', short: 'Jun' },
  { index: 6, name: 'Julio', short: 'Jul' },
  { index: 7, name: 'Agosto', short: 'Ago' },
  { index: 8, name: 'Septiembre', short: 'Sep' },
  { index: 9, name: 'Octubre', short: 'Oct' },
  { index: 10, name: 'Noviembre', short: 'Nov' },
  { index: 11, name: 'Diciembre', short: 'Dic' },
];

export const PrintableVacationStaffCalendar: React.FC<PrintableVacationStaffCalendarProps> = ({
  employees,
  timeOffRequests,
  companySettings,
  onSelectEmployeeToPlan,
  onOpenAuditor,
  onEditRequest,
  onOpenManager,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDept, setSelectedDept] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<ViewMode>('print_sheet');
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showGoogleSheetsHelp, setShowGoogleSheetsHelp] = useState<boolean>(false);

  // Today in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department && e.department.trim()) {
        set.add(e.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [employees]);

  // Compute staff summaries for the selected year
  const staffSummaries: EmployeeStaffVacationSummary[] = useMemo(() => {
    const yearStr = String(selectedYear);

    return employees.map((emp) => {
      const allocatedDays = emp.vacationDays ?? 30;

      // Filter requests belonging to this employee and overlapping with the year
      const empRequests = timeOffRequests.filter((r) => {
        const matchesUser =
          r.userId === emp.id ||
          (emp.fullName && r.userName && emp.fullName.trim().toLowerCase() === r.userName.trim().toLowerCase());
        if (!matchesUser) return false;
        if (r.leaveType !== 'Vacaciones') return false;
        if (r.status === 'RECHAZADO') return false;

        const sYear = r.startDate ? r.startDate.slice(0, 4) : '';
        const eYear = r.endDate ? r.endDate.slice(0, 4) : '';
        return sYear === yearStr || eYear === yearStr;
      });

      let enjoyedDays = 0;
      let scheduledDays = 0;
      let pendingDays = 0;

      const periods = empRequests.map((req) => {
        const analysis = analyzeSingleVacationRequest(req, emp);

        let classification: 'DISFRUTADA' | 'PREVISTA' | 'PENDIENTE';
        if (req.status === 'PENDIENTE') {
          classification = 'PENDIENTE';
          pendingDays += req.daysCount || analysis.days.length;
        } else if (req.endDate && req.endDate < todayStr) {
          classification = 'DISFRUTADA';
          enjoyedDays += req.daysCount || analysis.days.length;
        } else {
          classification = 'PREVISTA';
          scheduledDays += req.daysCount || analysis.days.length;
        }

        return { analysis, classification };
      });

      // Total audit calculation
      const audit = computeEmployeeVacationAudit(emp, timeOffRequests, selectedYear);
      const remainingDays = Math.max(0, allocatedDays - enjoyedDays - scheduledDays);

      return {
        employee: emp,
        allocatedDays,
        enjoyedDays,
        scheduledDays,
        pendingDays,
        remainingDays,
        fullWeekendsCount: audit.totalFullWeekends,
        workingSaturdaysCount: audit.workingSaturdaysUsed,
        offSaturdaysCount: audit.offSaturdaysUsed,
        isRuleSatisfied: audit.isRuleSatisfied,
        periods,
      };
    });
  }, [employees, timeOffRequests, selectedYear, todayStr]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return staffSummaries.filter((s) => {
      if (selectedDept !== 'TODOS' && s.employee.department !== selectedDept) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = s.employee.fullName.toLowerCase().includes(term);
        const matchesDni = s.employee.dni?.toLowerCase().includes(term);
        const matchesDept = s.employee.department?.toLowerCase().includes(term);
        if (!matchesName && !matchesDni && !matchesDept) return false;
      }
      return true;
    });
  }, [staffSummaries, selectedDept, searchTerm]);

  // Global totals for the staff
  const staffStats = useMemo(() => {
    let totalEnjoyed = 0;
    let totalScheduled = 0;
    let totalPending = 0;
    let totalAllocated = 0;
    let satisfiedRuleCount = 0;

    filteredSummaries.forEach((s) => {
      totalEnjoyed += s.enjoyedDays;
      totalScheduled += s.scheduledDays;
      totalPending += s.pendingDays;
      totalAllocated += s.allocatedDays;
      if (s.isRuleSatisfied) satisfiedRuleCount++;
    });

    return {
      totalEmployees: filteredSummaries.length,
      totalEnjoyed,
      totalScheduled,
      totalPending,
      totalAllocated,
      totalRemaining: Math.max(0, totalAllocated - totalEnjoyed - totalScheduled),
      satisfiedRuleCount,
    };
  }, [filteredSummaries]);

  // Export to CSV formatted for Google Sheets and Excel
  const handleExportToCSV = () => {
    const headers = [
      'Empleado',
      'DNI / NIE',
      'Departamento',
      'Turno Sábados',
      'Tipo Vacaciones',
      'Cupo Anual (Días)',
      'Días Disfrutados',
      'Días Previstos',
      'Días Pendientes',
      'Saldo Restante',
      'Fines de Semana Completos (Objetivo 4)',
      'Sábados Laborables (Objetivo 2)',
      'Sábados Libres (Objetivo 2)',
      'Cumple Regla 4 FDS',
      'Detalle Periodos Disfrutados',
      'Detalle Periodos Previstos',
      'Detalle Periodos Pendientes',
    ];

    const rows = filteredSummaries.map((s) => {
      const enjoyedList = s.periods
        .filter((p) => p.classification === 'DISFRUTADA')
        .map(
          (p) =>
            `${p.analysis.startDate} a ${p.analysis.endDate} (${p.analysis.daysCount}d | ${p.analysis.fullWeekendsCount} FDS)`
        )
        .join(' // ');

      const scheduledList = s.periods
        .filter((p) => p.classification === 'PREVISTA')
        .map(
          (p) =>
            `${p.analysis.startDate} a ${p.analysis.endDate} (${p.analysis.daysCount}d | ${p.analysis.fullWeekendsCount} FDS)`
        )
        .join(' // ');

      const pendingList = s.periods
        .filter((p) => p.classification === 'PENDIENTE')
        .map((p) => `${p.analysis.startDate} a ${p.analysis.endDate} (${p.analysis.daysCount}d)`)
        .join(' // ');

      return [
        `"${s.employee.fullName.replace(/"/g, '""')}"`,
        `"${(s.employee.dni || '').replace(/"/g, '""')}"`,
        `"${(s.employee.department || 'General').replace(/"/g, '""')}"`,
        `"${getEffectiveSaturdayPlan(s.employee)}"`,
        `"${s.employee.vacationDaysType === 'LABORABLES' ? 'Laborables' : 'Naturales'}"`,
        s.allocatedDays,
        s.enjoyedDays,
        s.scheduledDays,
        s.pendingDays,
        s.remainingDays,
        s.fullWeekendsCount,
        s.workingSaturdaysCount,
        s.offSaturdaysCount,
        s.isRuleSatisfied ? 'SÍ' : 'PENDIENTE',
        `"${enjoyedList.replace(/"/g, '""')}"`,
        `"${scheduledList.replace(/"/g, '""')}"`,
        `"${pendingList.replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vacaciones_Plantilla_${selectedYear}_FichaPlus.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Interactive Controls & Actions (Hidden during printing) */}
      <section className="no-print bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">📅</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Cuadrante Anual y Hoja Imprimible de Vacaciones
              </h2>
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-black">
                Año {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualiza en una sola hoja las vacaciones <strong>disfrutadas</strong> (pasadas) y{' '}
              <strong>previstas</strong> (futuras) de toda la plantilla, listas para imprimir en A4 o sincronizar con
              Google Sheets / Excel.
            </p>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer"
              title="Abrir diálogo de impresión o guardar como PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Imprimir Hoja A4 / PDF</span>
            </button>

            <button
              onClick={handleExportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-2 cursor-pointer"
              title="Descargar archivo para abrir en Google Sheets o Excel"
            >
              <span className="material-symbols-outlined text-base">table_view</span>
              <span>Exportar para Google Sheets (.CSV)</span>
            </button>

            <button
              onClick={() => setShowGoogleSheetsHelp(!showGoogleSheetsHelp)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ver instrucciones para Google Sheets"
            >
              <span className="material-symbols-outlined text-sm text-indigo-600">help</span>
              <span className="hidden sm:inline">Google Sheets</span>
            </button>

            {onOpenManager && (
              <button
                onClick={onOpenManager}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Ir al gestor para modificar o borrar vacaciones pasadas y futuras"
              >
                <span className="material-symbols-outlined text-base text-purple-600">edit_calendar</span>
                <span>Modificar / Borrar Vacaciones</span>
              </button>
            )}
          </div>
        </div>

        {/* Instructions banner for Google Sheets */}
        {showGoogleSheetsHelp && (
          <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 text-xs text-indigo-950 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between font-black">
              <span className="flex items-center gap-1.5">
                <span>📊</span>
                <span>Cómo abrir el archivo directamente en Google Sheets</span>
              </span>
              <button
                onClick={() => setShowGoogleSheetsHelp(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed font-medium">
              <li>
                Haz clic en <strong>«Exportar para Google Sheets (.CSV)»</strong> (se descargará el archivo en tu equipo).
              </li>
              <li>
                Entra en{' '}
                <a
                  href="https://sheets.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline font-bold"
                >
                  sheets.google.com
                </a>{' '}
                y crea una hoja en blanco.
              </li>
              <li>
                En el menú superior: ve a <strong>Archivo &gt; Importar &gt; Subir</strong> y arrastra el archivo CSV.
              </li>
              <li>
                Selecciona <em>«Reemplazar hoja de cálculo»</em> y tipo de separador <em>«Punto y coma (;)»</em> o{' '}
                <em>«Detectar automáticamente»</em>.
              </li>
              <li>¡Listo! Tendrás el cuadrante completo de la plantilla formateado y listo para compartir en tu Drive.</li>
            </ol>
          </div>
        )}

        {/* Filters and View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
              <button
                onClick={() => setViewMode('print_sheet')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'print_sheet' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-600">description</span>
                <span>Hoja Imprimible A4</span>
              </button>

              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'matrix' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-600">view_module</span>
                <span>Matriz de Plantilla</span>
              </button>

              <button
                onClick={() => setViewMode('monthly_calendar')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'monthly_calendar'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-600">calendar_month</span>
                <span>Calendario Mensual</span>
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase px-1">Año:</span>
              {[2025, 2026, 2027].map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                    selectedYear === y ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Department & Search Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="TODOS">Todos los Departamentos ({employees.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </section>

      {/* Staff Executive KPI Summary Bar (visible on screen and in print) */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 print:bg-white print:text-black print:border-slate-300 print:p-3 print:rounded-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center divide-x-0 sm:divide-x divide-slate-700/50 print:divide-slate-300">
          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-slate-600 block">
              Plantilla Filtrada
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white print:text-slate-900 block mt-0.5">
              {staffStats.totalEmployees}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">trabajadores</span>
          </div>

          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 print:text-emerald-700 block">
              Días Disfrutados
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 print:text-emerald-700 block mt-0.5">
              {staffStats.totalEnjoyed}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">ya pasados</span>
          </div>

          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 print:text-indigo-700 block">
              Días Previstos
            </span>
            <span className="text-2xl sm:text-3xl font-black text-indigo-300 print:text-indigo-700 block mt-0.5">
              {staffStats.totalScheduled}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">futuros aprobados</span>
          </div>

          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 print:text-amber-700 block">
              Días Pendientes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 print:text-amber-700 block mt-0.5">
              {staffStats.totalPending}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">por confirmar</span>
          </div>

          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 print:text-slate-600 block">
              Saldo Restante
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-200 print:text-slate-900 block mt-0.5">
              {staffStats.totalRemaining}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">de {staffStats.totalAllocated} días</span>
          </div>

          <div className="px-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 print:text-purple-700 block">
              Regla 4 FDS
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-300 print:text-purple-700 block mt-0.5">
              {staffStats.satisfiedRuleCount} / {staffStats.totalEmployees}
            </span>
            <span className="text-[10px] text-slate-400 print:text-slate-500">empleados cumplen</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          MODE 1: PRINT SHEET (HIGH CONTRAST, CLEAN A4 LANDSCAPE)
         ========================================================= */}
      {viewMode === 'print_sheet' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 print:border-0 print:shadow-none print:p-0">
          {/* Print Sheet Formal Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">
                  Documento Oficial de Registro y Planificación Vacacional
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-0.5">
                  CUADRANTE ANUAL DE VACACIONES DE PLANTILLA — AÑO {selectedYear}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Empresa: <strong>{companySettings?.companyName || 'Empresa'}</strong> • CIF:{' '}
                  <strong>{companySettings?.fiscalId || 'No especificado'}</strong> • Centro: <strong>Principal</strong>
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>
                  Fecha de Emisión: <strong>{todayStr}</strong>
                </p>
                <p>
                  Departamento: <strong>{selectedDept === 'TODOS' ? 'Toda la Plantilla' : selectedDept}</strong>
                </p>
                <p>
                  Regla Marco: <strong>30 días naturales / 4 fines de semana (2 Sáb. Trab. + 2 Sáb. Lib.)</strong>
                </p>
              </div>
            </div>

            {/* Legend bar */}
            <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-slate-200 text-xs font-bold">
              <span className="text-slate-500 text-[11px] uppercase tracking-wider">Leyenda:</span>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md text-[11px]">
                <span>[DISF]</span>
                <span>Vacaciones Disfrutadas (Fechas pasadas)</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded-md text-[11px]">
                <span>[PREV]</span>
                <span>Vacaciones Previstas (Futuras aprobadas)</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                <span>[PEND]</span>
                <span>Solicitud Pendiente</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md text-[11px]">
                <span>[FDS]</span>
                <span>Fin de Semana Completo (Sáb + Dom)</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                <span>[S-Lab]</span>
                <span>Sábado Laborable de Turno</span>
              </span>
            </div>
          </div>

          {/* Printable Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print-table text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Empleado</th>
                  <th className="py-2.5 px-2">DNI</th>
                  <th className="py-2.5 px-2">Depto.</th>
                  <th className="py-2.5 px-2 text-center">Turno Sáb.</th>
                  <th className="py-2.5 px-2 text-center">Cupo</th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50 text-emerald-950">Disfrutadas</th>
                  <th className="py-2.5 px-2 text-center bg-indigo-50 text-indigo-950">Previstas</th>
                  <th className="py-2.5 px-2 text-center bg-slate-50 text-slate-900">Saldo</th>
                  <th className="py-2.5 px-2 text-center bg-purple-50 text-purple-950">FDS (4 req)</th>
                  <th className="py-2.5 px-3 min-w-[320px]">Periodos Disfrutados y Previstos (Detalle)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredSummaries.map((s, idx) => {
                  const satPlan = getEffectiveSaturdayPlan(s.employee);

                  return (
                    <tr
                      key={s.employee.id}
                      className={`hover:bg-slate-50 transition-colors print-avoid-break ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* Name */}
                      <td className="py-2.5 px-3 font-bold text-slate-950">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                          <span>{s.employee.fullName}</span>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="py-2.5 px-2 font-mono text-slate-600 text-[11px]">
                        {s.employee.dni || '—'}
                      </td>

                      {/* Dept */}
                      <td className="py-2.5 px-2 text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                          {s.employee.department || 'General'}
                        </span>
                      </td>

                      {/* Saturday Plan */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-[10px] font-bold text-slate-600">{satPlan}</span>
                      </td>

                      {/* Cupo */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        {s.allocatedDays}d
                      </td>

                      {/* Disfrutadas */}
                      <td className="py-2.5 px-2 text-center font-black bg-emerald-50/50 text-emerald-700">
                        {s.enjoyedDays > 0 ? `${s.enjoyedDays}d` : '0'}
                      </td>

                      {/* Previstas */}
                      <td className="py-2.5 px-2 text-center font-black bg-indigo-50/50 text-indigo-700">
                        {s.scheduledDays > 0 ? `${s.scheduledDays}d` : '0'}
                        {s.pendingDays > 0 && (
                          <span className="text-[10px] text-amber-600 block">+{s.pendingDays} pend.</span>
                        )}
                      </td>

                      {/* Saldo Restante */}
                      <td className="py-2.5 px-2 text-center font-black text-slate-900">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            s.remainingDays === 0
                              ? 'bg-slate-200 text-slate-700'
                              : s.remainingDays < 5
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-indigo-100 text-indigo-900'
                          }`}
                        >
                          {s.remainingDays}d
                        </span>
                      </td>

                      {/* Weekend Rule Audit */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              s.isRuleSatisfied
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.fullWeekendsCount >= 4
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {s.fullWeekendsCount} / 4 FDS
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            Sáb: {s.workingSaturdaysCount}L / {s.offSaturdaysCount}D
                          </span>
                        </div>
                      </td>

                      {/* Periods breakdown list */}
                      <td className="py-2.5 px-3">
                        {s.periods.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">Sin periodos registrados</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {s.periods.map((p, pIdx) => {
                              const isEnjoyed = p.classification === 'DISFRUTADA';
                              const isPending = p.classification === 'PENDIENTE';

                              return (
                                <div
                                  key={p.analysis.requestId || pIdx}
                                  className={`rounded-md px-2 py-1 text-[10px] border flex items-center gap-1.5 ${
                                    isEnjoyed
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                      : isPending
                                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                                      : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                                  }`}
                                  title={`${p.analysis.startDate} al ${p.analysis.endDate} • ${p.analysis.fullWeekendsCount} FDS • Sábados Lab: ${p.analysis.workingSaturdaysCount}, Libres: ${p.analysis.offSaturdaysCount}`}
                                >
                                  <span className="font-black">
                                    {isEnjoyed ? '✓ [D]' : isPending ? '⏳ [Pend]' : '📅 [P]'}
                                  </span>
                                  <span className="font-semibold">
                                    {p.analysis.startDate.slice(5)} al {p.analysis.endDate.slice(5)}
                                  </span>
                                  <span className="bg-white/80 px-1 rounded font-black">
                                    {p.analysis.daysCount}d
                                  </span>
                                  {p.analysis.fullWeekendsCount > 0 && (
                                    <span className="text-[9px] text-purple-700 font-bold">
                                      ({p.analysis.fullWeekendsCount} FDS)
                                    </span>
                                  )}
                                  {p.analysis.workingSaturdaysCount > 0 && (
                                    <span className="text-[9px] text-amber-700 font-bold">
                                      {p.analysis.workingSaturdaysCount} S-Lab
                                    </span>
                                  )}
                                  {onEditRequest && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const req = timeOffRequests.find(
                                          (r) => r.id === p.analysis.requestId || (r as any).internalId === p.analysis.requestId
                                        );
                                        if (req) onEditRequest(req);
                                      }}
                                      className="no-print opacity-60 hover:opacity-100 hover:text-indigo-700 ml-0.5 p-0.5 rounded cursor-pointer transition-opacity"
                                      title="Modificar o eliminar este periodo"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legal Stamp & Signatures Box for Print */}
          <div className="mt-10 pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs text-slate-700 print-avoid-break">
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center h-32 flex flex-col justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                Firma y Sello de la Dirección / Recursos Humanos
              </span>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400">Por la Empresa • Fdo: _________________________</span>
            </div>

            <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center h-32 flex flex-col justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                Conformidad Representación de los Trabajadores / Plantilla
              </span>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400">
                Notificado según Art. 38 del Estatuto de los Trabajadores
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          MODE 2: INTERACTIVE STAFF MATRIX WITH CARDS & SHORTCUTS
         ========================================================= */}
      {viewMode === 'matrix' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map((s) => {
              const totalUsed = s.enjoyedDays + s.scheduledDays;
              const percentUsed = Math.min(100, Math.round((totalUsed / s.allocatedDays) * 100));

              return (
                <div
                  key={s.employee.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
                >
                  <div className="space-y-3">
                    {/* Employee Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-base text-slate-900 leading-tight">
                          {s.employee.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.employee.department || 'General'} • DNI: {s.employee.dni || '—'}
                        </p>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                        {getEffectiveSaturdayPlan(s.employee)}
                      </span>
                    </div>

                    {/* Progress Bar of 30 days */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700">
                          {totalUsed} de {s.allocatedDays} días computados
                        </span>
                        <span className="font-bold text-indigo-600">{s.remainingDays} días libres</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.round((s.enjoyedDays / s.allocatedDays) * 100)}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Disfrutadas: ${s.enjoyedDays} días`}
                        />
                        <div
                          style={{ width: `${Math.round((s.scheduledDays / s.allocatedDays) * 100)}%` }}
                          className="bg-indigo-500 h-full"
                          title={`Previstas: ${s.scheduledDays} días`}
                        />
                      </div>
                    </div>

                    {/* Rule pill metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                      <div className="bg-emerald-50 border border-emerald-200/70 p-2 rounded-xl">
                        <span className="text-emerald-700 font-bold block">Disfrutadas</span>
                        <span className="font-black text-sm text-emerald-950">{s.enjoyedDays}d</span>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200/70 p-2 rounded-xl">
                        <span className="text-indigo-700 font-bold block">Previstas</span>
                        <span className="font-black text-sm text-indigo-950">{s.scheduledDays}d</span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200/70 p-2 rounded-xl">
                        <span className="text-purple-700 font-bold block">FDS Cumplidos</span>
                        <span className="font-black text-sm text-purple-950">{s.fullWeekendsCount} / 4</span>
                      </div>
                    </div>

                    {/* Periods breakdown list */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                        Periodos del año {selectedYear} ({s.periods.length}):
                      </span>

                      {s.periods.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">Sin vacaciones registradas</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {s.periods.map((p, idx) => {
                            const isEnjoyed = p.classification === 'DISFRUTADA';
                            const isPending = p.classification === 'PENDIENTE';

                            return (
                              <div
                                key={idx}
                                className={`text-[11px] p-2 rounded-xl border flex items-center justify-between gap-2 ${
                                  isEnjoyed
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    : isPending
                                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                    : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                                }`}
                              >
                                <div>
                                  <span className="font-black block">
                                    {isEnjoyed ? '✓ Disfrutada' : isPending ? '⏳ Pendiente' : '📅 Prevista'}:{' '}
                                    {p.analysis.startDate} al {p.analysis.endDate}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {p.analysis.fullWeekendsCount} FDS • Sábados Lab: {p.analysis.workingSaturdaysCount}, Libres:{' '}
                                    {p.analysis.offSaturdaysCount}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="bg-white px-2 py-0.5 rounded-md font-black text-xs shadow-2xs">
                                    {p.analysis.daysCount}d
                                  </span>
                                  {onEditRequest && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const req = timeOffRequests.find(
                                          (r) => r.id === p.analysis.requestId || (r as any).internalId === p.analysis.requestId
                                        );
                                        if (req) onEditRequest(req);
                                      }}
                                      className="no-print bg-white/90 hover:bg-white text-indigo-700 hover:text-indigo-900 border border-slate-200 p-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                                      title="Modificar o borrar periodo"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for this employee */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                    <button
                      onClick={() => onOpenAuditor && onOpenAuditor(s.employee.id)}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                    >
                      ⚖️ Auditor Sábados
                    </button>

                    <button
                      onClick={() => onSelectEmployeeToPlan && onSelectEmployeeToPlan(s.employee.id)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      + Planificar Vacaciones
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================
          MODE 3: MONTHLY SHARED CALENDAR (COINCIDENCES PER DAY)
         ========================================================= */}
      {viewMode === 'monthly_calendar' && (
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Calendario Conjunto de Vacaciones — {MONTHS_ES[activeMonth].name} {selectedYear}
              </h3>
              <p className="text-xs text-slate-500">
                Observa qué empleados coinciden de vacaciones en cada día del mes para prevenir desatención de departamentos.
              </p>
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 scrollbar-thin">
              {MONTHS_ES.map((m) => (
                <button
                  key={m.index}
                  onClick={() => setActiveMonth(m.index)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeMonth === m.index
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>

          {/* Month Matrix Grid */}
          <MonthlyStaffGrid
            year={selectedYear}
            monthIndex={activeMonth}
            summaries={filteredSummaries}
            todayStr={todayStr}
          />
        </section>
      )}
    </div>
  );
};

// Sub-component: Monthly grid showing day-by-day staff on vacation
interface MonthlyStaffGridProps {
  year: number;
  monthIndex: number;
  summaries: EmployeeStaffVacationSummary[];
  todayStr: string;
}

const MonthlyStaffGrid: React.FC<MonthlyStaffGridProps> = ({ year, monthIndex, summaries, todayStr }) => {
  const daysInMonth = useMemo(() => {
    const d = new Date(year, monthIndex + 1, 0);
    return d.getDate();
  }, [year, monthIndex]);

  const daysArray = useMemo(() => {
    const list: {
      dayNumber: number;
      dateStr: string;
      dayOfWeek: number;
      isWeekend: boolean;
      staffOnVacation: {
        employeeName: string;
        department: string;
        classification: 'DISFRUTADA' | 'PREVISTA' | 'PENDIENTE';
        isSaturday: boolean;
        saturdayType?: 'LABORABLE' | 'LIBRE';
      }[];
    }[] = [];

    const monthStr = String(monthIndex + 1).padStart(2, '0');

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const jsDate = new Date(year, monthIndex, day);
      const dayOfWeek = jsDate.getDay(); // 0=Dom, 6=Sáb

      const onVacation: {
        employeeName: string;
        department: string;
        classification: 'DISFRUTADA' | 'PREVISTA' | 'PENDIENTE';
        isSaturday: boolean;
        saturdayType?: 'LABORABLE' | 'LIBRE';
      }[] = [];

      summaries.forEach((s) => {
        s.periods.forEach((p) => {
          const matchingDay = p.analysis.days.find((d) => d.dateStr === dateStr);
          if (matchingDay) {
            onVacation.push({
              employeeName: s.employee.fullName,
              department: s.employee.department || 'General',
              classification: p.classification,
              isSaturday: matchingDay.isSaturday,
              saturdayType: matchingDay.saturdayType,
            });
          }
        });
      });

      list.push({
        dayNumber: day,
        dateStr,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        staffOnVacation: onVacation,
      });
    }

    return list;
  }, [year, monthIndex, daysInMonth, summaries]);

  const DAY_HEADERS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  // Leading empty cells for Monday-first week
  const firstDayOfWeek = useMemo(() => {
    const d = new Date(year, monthIndex, 1);
    const day = d.getDay(); // 0=Dom
    return day === 0 ? 6 : day - 1; // 0=Lun, ..., 6=Dom
  }, [year, monthIndex]);

  return (
    <div className="space-y-3">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">
        {DAY_HEADERS.map((h, i) => (
          <div key={h} className={i >= 5 ? 'text-indigo-400 font-bold' : ''}>
            {h}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty padding cells for start of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] bg-slate-50/40 rounded-2xl border border-transparent" />
        ))}

        {daysArray.map((day) => {
          const isToday = day.dateStr === todayStr;
          const isPast = day.dateStr < todayStr;
          const hasVacation = day.staffOnVacation.length > 0;

          return (
            <div
              key={day.dayNumber}
              className={`min-h-[95px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                isToday
                  ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                  : day.isWeekend
                  ? 'bg-slate-50/90 border-slate-200/80'
                  : 'bg-white border-slate-200/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black ${
                    isToday
                      ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                      : day.isWeekend
                      ? 'text-indigo-900 font-bold'
                      : 'text-slate-700'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {hasVacation && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                    {day.staffOnVacation.length} {day.staffOnVacation.length === 1 ? 'persona' : 'personas'}
                  </span>
                )}
              </div>

              {/* Staff tags inside this day */}
              <div className="mt-1 space-y-1 overflow-y-auto max-h-16 scrollbar-none">
                {day.staffOnVacation.map((v, idx) => {
                  const isEnjoyed = v.classification === 'DISFRUTADA';
                  const isPending = v.classification === 'PENDIENTE';

                  return (
                    <div
                      key={idx}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate flex items-center justify-between gap-1 ${
                        isEnjoyed
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                          : isPending
                          ? 'bg-amber-100 text-amber-950 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-950 border border-indigo-200'
                      }`}
                      title={`${v.employeeName} (${v.department}) • ${
                        isEnjoyed ? 'Disfrutada' : isPending ? 'Pendiente' : 'Prevista'
                      }${v.isSaturday ? ` • Sábado: ${v.saturdayType}` : ''}`}
                    >
                      <span className="truncate">{v.employeeName.split(' ')[0]}</span>
                      {v.isSaturday && (
                        <span className="text-[8px] shrink-0">
                          {v.saturdayType === 'LABORABLE' ? '💼' : '🏖️'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
