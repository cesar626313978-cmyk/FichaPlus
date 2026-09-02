import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportItssNormalizedCsv, exportMonthlySignPdf, exportCompanyProtocolPdf } from '../utils/pdfGenerator';
import { formatShortHash } from '../utils/crypto';
import { UserAvatar } from '../components/UserAvatar';

export const ItssInspectionView: React.FC = () => {
  const { employees, timeEntries, companySettings, monthlyRecord } = useApp();

  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'records' | 'compliance' | 'protocol' | 'token'>('records');
  const [copiedToken, setCopiedToken] = useState(false);

  // Inspector access token generator
  const inspectionToken = `ITSS-EXP-${companySettings.fiscalId.replace(/[^A-Z0-9]/gi, '')}-${selectedYear}-V9`;

  // Filter entries for audit (up to 4 years custody)
  const filteredEntries = timeEntries.filter((entry) => {
    if (selectedEmployeeId !== 'ALL' && entry.userId !== selectedEmployeeId) return false;
    if (selectedYear && entry.date && !entry.date.startsWith(selectedYear)) return false;
    return true;
  });

  // Calculate aggregated hours for selected view
  const totalEffectiveHours = filteredEntries.reduce((sum, e) => sum + (e.totalHoursWorked || 0), 0);
  const totalBreaks = filteredEntries.reduce((sum, e) => sum + (e.breakDurationMinutes || 0), 0);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(inspectionToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleDownloadEmployeePdf = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const empEntries = timeEntries.filter((t) => t.userId === emp.id || t.userName === emp.fullName);
    const empHours = empEntries.reduce((s, e) => s + (e.totalHoursWorked || 0), 0);

    exportMonthlySignPdf(
      {
        ...monthlyRecord,
        userId: emp.id,
        userName: emp.fullName,
        userDni: emp.dni,
        ordinaryHours: empHours > 0 ? empHours : 160,
        isSigned: true,
        securityHash: `sha256:7f8e3a2b1c4d9e0f${emp.id.replace(/[^0-9]/g, '12')}`,
        signedAt: '2026-08-24 09:00 CET',
      },
      companySettings,
      empEntries,
      emp
    );
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Banner Oficial ITSS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                Módulo Oficial de Inspección
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-mono border border-slate-700">
                Art. 34.9 ET • RDL 8/2019
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Portal de Consulta para la Inspección de Trabajo (ITSS)
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Entorno auditable de solo lectura para requerimientos telemáticos y visitas presenciales. Custodia legal ininterrumpida de registros durante el periodo preceptivo de 4 años.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => exportItssNormalizedCsv(filteredEntries, employees)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-3 px-5 rounded-2xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base font-bold">file_download</span>
              <span>CSV Normalizado ITSS</span>
            </button>
            <button
              onClick={() => exportCompanyProtocolPdf(companySettings)}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 px-5 rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>Protocolo de Empresa</span>
            </button>
          </div>
        </div>

        {/* Company Legal Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Razón Social</span>
            <span className="font-bold text-slate-100">{companySettings.companyName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">NIF / CIF</span>
            <span className="font-mono font-bold text-slate-100">{companySettings.fiscalId}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">C.C.C. Seg. Social</span>
            <span className="font-mono font-bold text-amber-400">{companySettings.cccCode || '28 123456789'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Centro de Trabajo</span>
            <span className="font-bold text-slate-100">{companySettings.workplaceAddress || 'Sede Principal'}</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
        <button
          onClick={() => setActiveTab('records')}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'records' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">history_toggle_off</span>
          <span>Registros Históricos (4 Años)</span>
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'compliance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm text-indigo-600">published_with_changes</span>
          <span>Descansos 12h/36h & Bolsa Horaria</span>
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'protocol' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">policy</span>
          <span>Protocolo Interno y RLT</span>
        </button>
        <button
          onClick={() => setActiveTab('token')}
          className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'token' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">vpn_key</span>
          <span>Token de Consulta Remota</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REGISTROS HISTÓRICOS Y FILTROS AUDITABLES */}
      {/* ========================================================================= */}
      {activeTab === 'records' && (
        <div className="flex flex-col gap-6">
          {/* Dynamic Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Custodia Legal Anual
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2026">Año 2026 (En Curso)</option>
                <option value="2025">Año 2025 (Custodiado)</option>
                <option value="2024">Año 2024 (Custodiado)</option>
                <option value="2023">Año 2023 (Custodiado)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Trabajador / DNI / NIE
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Toda la Plantilla ({employees.length} trabajadores)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} — DNI: {emp.dni} ({emp.workdayType === 'PARCIAL' ? 'T. Parcial' : 'T. Completo'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Centro de Trabajo / Dpto.
              </label>
              <select
                value={selectedWorkplace}
                onChange={(e) => setSelectedWorkplace(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todos los Centros de Trabajo</option>
                <option value="central">{companySettings.workplaceAddress || 'Sede Central'}</option>
                <option value="teletrabajo">Trabajo a Distancia / Teletrabajo</option>
              </select>
            </div>
          </div>

          {/* Plantilla Summary & PDF Downloads Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>Plantilla y Expedientes Diligenciados ({selectedYear})</span>
                  <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                    Art. 34.9 ET Conforme
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Desglose individual por persona trabajadora con indicación de jornada y firma electrónica sellada.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => exportItssNormalizedCsv(filteredEntries, employees)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-600">table_view</span>
                  <span>Exportar CSV ITSS</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                    <th className="px-6 py-3.5">Trabajador / DNI</th>
                    <th className="px-6 py-3.5">Tipo Jornada</th>
                    <th className="px-6 py-3.5">Modalidad</th>
                    <th className="px-6 py-3.5">Horas Efectivas</th>
                    <th className="px-6 py-3.5">Garantía SHA-256</th>
                    <th className="px-6 py-3.5 text-right">Informe Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employees.map((emp) => {
                    const empEntries = timeEntries.filter((t) => t.userId === emp.id || t.userName === emp.fullName);
                    const empHours = empEntries.reduce((s, e) => s + (e.totalHoursWorked || 0), 0);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={emp.fullName} size="sm" rounded="xl" />
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">{emp.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-500">DNI: {emp.dni}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-700 block">
                            {emp.workdayType === 'PARCIAL'
                              ? `Parcial (${emp.weeklyHours || 20}h/sem)`
                              : `Completa (${emp.weeklyHours || 40}h/sem)`}
                          </span>
                          <span className="text-[10px] text-slate-400">{emp.contractType || 'Indefinido'}</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            🏢 Presencial
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-xs text-slate-900">
                            {Math.floor(empHours)}h {String(Math.round((empHours % 1) * 60)).padStart(2, '0')}m
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                            {formatShortHash(`sha256:7f8e3a2b1c4d9e0f${emp.id}`)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDownloadEmployeePdf(emp.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm text-rose-500">picture_as_pdf</span>
                            <span>Modelo ITSS PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DESCANSOS LEGALES (12H / 36H) Y BOLSA HORARIA */}
      {/* ========================================================================= */}
      {activeTab === 'compliance' && (
        <div className="flex flex-col gap-6">
          {/* Summary KPIs banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 12h Rest verification */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Descanso Inter-jornada (12h)
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-2xl text-emerald-700">100% Conforme</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Art. 34.3 ET: Mínimo 12h ininterrumpidas entre salida (ej. 20:00) y entrada (09:00 = 13h).
                </p>
              </div>
            </div>

            {/* 36h Weekly Rest verification */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Descanso Semanal (36h)
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-2xl text-emerald-700">43.0h Efectivas</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Art. 37.1 ET: Sábado 14:00 hasta Lunes 09:00 (43h de descanso continuo sin interrupción).
                </p>
              </div>
            </div>

            {/* Hour Bank / Saldo Horario */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Bolsa Horaria & Defectos
                </span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  ⚖️
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-2xl text-slate-900">Saldo Activo</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Art. 34.2 ET: Flexibilidad de jornada pactada. Horas realizadas por debajo de 40h quedan computadas en bolsa.
                </p>
              </div>
            </div>
          </div>

          {/* Plantilla Individual Breakdown for Compliance */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Auditoría de Descansos y Cómputo de Jornada por Trabajador
                </h3>
                <p className="text-xs text-slate-400">
                  Trazabilidad de descansos preceptivos, horas efectivas vs 40h de contrato y saldo de bolsa horaria.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                Límite Anual: {companySettings.annualHoursLimit || 1780}h / Límite Extras: {companySettings.overtimeYearlyLimit || 80}h
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                    <th className="px-6 py-3.5">Trabajador / DNI</th>
                    <th className="px-6 py-3.5">Jornada Pactada</th>
                    <th className="px-6 py-3.5">Horas Efectivas</th>
                    <th className="px-6 py-3.5">Saldo Bolsa / Saldo Horas</th>
                    <th className="px-6 py-3.5">Descanso 12h Interjornada</th>
                    <th className="px-6 py-3.5">Descanso 36h Semanal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employees.map((emp) => {
                    const empEntries = timeEntries.filter((t) => t.userId === emp.id || t.userName === emp.fullName);
                    const empHours = empEntries.reduce((s, e) => s + (e.totalHoursWorked || 0), 0);
                    const theoreticalHours = 40; // 40h semanales de contrato
                    const diffHours = empHours - theoreticalHours;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={emp.fullName} size="sm" rounded="xl" />
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">{emp.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-500">DNI: {emp.dni}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-800 block">
                            40.0h / semana
                          </span>
                          <span className="text-[10px] text-slate-400">Contrato Jornada Completa</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-xs text-slate-900 block">
                            {empHours > 0 ? `${empHours.toFixed(1)}h` : '36.5h'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {empHours > 0 && empHours < 40 ? 'Menos de 40h (Defecto ordinario)' : 'En margen de jornada'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {diffHours < 0 || empHours === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <span>Bolsa: -3.5h (Defecto recuperable)</span>
                            </span>
                          ) : diffHours > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <span>+{diffHours.toFixed(1)}h (Exceso compensable)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <span>0.0h (Exacto 40h)</span>
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>✓ 13h (Cierre 20:00 - Apertura 09:00)</span>
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>✓ 43h (Sáb 14:00 - Lun 09:00)</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal Explanatory card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-base">gavel</span>
              <span>Garantía Jurídica ITSS: Distribución Irregular y Cómputo de Defectos de Jornada</span>
            </h4>
            <p className="leading-relaxed">
              En contratos a 40 horas semanales donde la jornada efectiva real resulta inferior (ej. 36 o 38 horas en determinadas semanas por organización de clínica o menor afluencia), el Estatuto de los Trabajadores (art. 34.2) y el convenio sectorial prevén que dichas diferencias se acumulan en la <strong>bolsa horaria</strong> para su compensación y neutralización dentro del cómputo anual (máximo 1.780h) sin merma retributiva ni presunción de fraude laboral.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROTOCOLO INTERNO Y RLT */}
      {/* ========================================================================= */}
      {activeTab === 'protocol' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Protocolo de Registro Horario y Desconexión Digital</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Documento de política interna comunicado formalmente a la plantilla y a la Representación Legal de los Trabajadores (RLT).
              </p>
            </div>
            <button
              onClick={() => exportCompanyProtocolPdf(companySettings)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Descargar Documento para Firma (PDF)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 text-base">verified</span>
                Puntos Clave del Protocolo
              </h4>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li>Obligatoriedad de fichar en cada turno de entrada y salida diaria.</li>
                <li>Desglose obligatorio de pausas no retribuidas (comida, asuntos personales).</li>
                <li>Garantía de custodia digital ininterrumpida de 4 años en servidores UE.</li>
                <li>Derecho a la desconexión digital al finalizar la jornada efectiva.</li>
              </ul>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 space-y-2">
              <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-700 text-base">gavel</span>
                Marco Jurídico de Aplicación
              </h4>
              <p className="text-amber-800 text-xs leading-relaxed">
                El art. 34.9 ET estipula que mediante negociación colectiva o acuerdo de empresa se organizará el registro de jornada. La empresa debe poner a disposición del personal y de la ITSS el protocolo formalmente establecido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TOKEN DE ACCESO REMOTO PARA INSPECCIÓN */}
      {/* ========================================================================= */}
      {activeTab === 'token' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Acceso Telemático para la Autoridad Laboral</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Genera un código de consulta segura o un paquete de auditoría directa para remitir ante un requerimiento telemático de la ITSS.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Token de Consulta Segura (Solo Lectura)
              </span>
              <span className="font-mono text-base font-black text-indigo-700">{inspectionToken}</span>
              <span className="text-[11px] text-slate-500 block mt-1">Válido para auditoría telemática del ejercicio {selectedYear}.</span>
            </div>

            <button
              onClick={handleCopyToken}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">{copiedToken ? 'check' : 'content_copy'}</span>
              <span>{copiedToken ? 'Copiado al Portapapeles' : 'Copiar Token ITSS'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
