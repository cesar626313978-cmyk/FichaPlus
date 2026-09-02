import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportAuditPdf, exportAuditCsv } from '../utils/pdfGenerator';
import { formatShortHash } from '../utils/crypto';

export const AuditView: React.FC = () => {
  const { auditLogs } = useApp();
  const [filterAction, setFilterAction] = useState<'ALL' | 'EDICIÓN' | 'ELIMINACIÓN' | 'ENTRADA MANUAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = auditLogs.filter((log) => {
    const matchesType = filterAction === 'ALL' || log.actionType === filterAction;
    const matchesSearch =
      log.affectedUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.justification.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs px-3 py-1 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            Registro Inmutable SHA-256
          </span>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            Auditoría Legal y Trazabilidad
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Trazabilidad de modificaciones, justificaciones y firmas criptográficas según la normativa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => exportAuditPdf(filtered)}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            PDF Legal
          </button>
          <button
            onClick={() => exportAuditCsv(filtered)}
            className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">table_view</span>
            Excel / CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="w-full md:w-1/2 relative">
          <input
            type="text"
            placeholder="Buscar por empleado, motivo o responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-full py-2.5 px-4 pl-10 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all focus:outline-none"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-base text-slate-400">
            search
          </span>
        </div>

        {/* Action Type Filters */}
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 rounded-2xl">
          {(['ALL', 'EDICIÓN', 'ELIMINACIÓN', 'ENTRADA MANUAL'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterAction(type)}
              className={`py-1.5 px-3 rounded-xl font-bold text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${
                filterAction === type
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {type === 'ALL' ? 'Todos' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Cards */}
      <div className="space-y-3.5">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-3.5 relative"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-3 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                    log.actionType === 'EDICIÓN'
                      ? 'bg-amber-100 text-amber-800'
                      : log.actionType === 'ELIMINACIÓN'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {log.actionType}
                </span>
                <span className="font-medium text-xs text-slate-400">{log.timestamp}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold bg-slate-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-slate-100">
                  Hash: {formatShortHash(log.securityHash)}
                </span>
              </div>
            </div>

            {/* Content info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                  Realizado por
                </span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  {log.performedBy}{' '}
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {log.performedByRole}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                  Usuario / Registro Afectado
                </span>
                <p className="font-bold text-slate-800">{log.affectedUserName}</p>
              </div>
            </div>

            {/* Changes info */}
            {(log.previousValue || log.newValue) && (
              <div className="bg-slate-50 rounded-2xl p-3 text-xs font-mono border border-slate-100 space-y-1">
                {log.previousValue && <p className="text-rose-500 font-medium">{log.previousValue}</p>}
                {log.newValue && <p className="text-emerald-600 font-bold">{log.newValue}</p>}
              </div>
            )}

            {/* Justification */}
            <div className="bg-indigo-50/40 rounded-2xl p-3.5 text-xs border border-indigo-50">
              <span className="text-[10px] font-bold uppercase text-indigo-600 block mb-0.5">
                Justificación legal del cambio
              </span>
              <p className="text-slate-700 italic">"{log.justification}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
