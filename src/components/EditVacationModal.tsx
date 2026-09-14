import React, { useState, useEffect, useMemo } from 'react';
import { TimeOffRequest, EmployeeRecord } from '../types';
import { analyzeSingleVacationRequest } from '../utils/vacationWeekendUtils';

interface EditVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TimeOffRequest | null;
  employees: EmployeeRecord[];
  isAdmin?: boolean;
  onSave: (id: string, updates: Partial<TimeOffRequest>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EditVacationModal: React.FC<EditVacationModalProps> = ({
  isOpen,
  onClose,
  request,
  employees,
  isAdmin = true,
  onSave,
  onDelete,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [leaveType, setLeaveType] = useState<TimeOffRequest['leaveType']>('Vacaciones');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [daysCount, setDaysCount] = useState<number>(1);
  const [status, setStatus] = useState<'APROBADO' | 'PENDIENTE' | 'RECHAZADO'>('APROBADO');
  const [notes, setNotes] = useState<string>('');
  const [reviewedBy, setReviewedBy] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Initialize form whenever request changes or modal opens
  useEffect(() => {
    if (request) {
      setSelectedUserId(request.userId || employees[0]?.id || '');
      setLeaveType(request.leaveType || 'Vacaciones');
      setStartDate(request.startDate || '');
      setEndDate(request.endDate || '');
      setDaysCount(request.daysCount || 1);
      setStatus(request.status || 'APROBADO');
      setNotes(request.notes || '');
      setReviewedBy(request.reviewedBy || '');
      setConfirmDelete(false);
      setErrorMessage(null);
    }
  }, [request, employees]);

  if (!isOpen || !request) return null;

  // Selected employee object
  const currentEmp = employees.find((e) => e.id === selectedUserId) || employees.find((e) => e.fullName === request.userName);

  // Determine if past or future
  const isPast = endDate ? endDate < todayStr : false;
  const isFuture = startDate ? startDate > todayStr : false;
  const isCurrent = !isPast && !isFuture && Boolean(startDate && endDate);

  // Recalculate days based on employee vacation regime
  const handleRecalculateDays = () => {
    if (!startDate || !endDate) return;
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return;

    if (currentEmp?.vacationDaysType === 'LABORABLES') {
      let count = 0;
      const cur = new Date(s);
      const worksSat = currentEmp.worksSaturday ?? false;
      while (cur <= e) {
        const dow = cur.getDay(); // 0=Sun, 6=Sat
        if (dow !== 0 && (dow !== 6 || worksSat)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      setDaysCount(Math.max(1, count));
    } else {
      // Natural days
      const diffTime = e.getTime() - s.getTime();
      const calDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDaysCount(Math.max(1, calDays));
    }
  };

  // Weekend and Saturday analysis for live preview
  const liveAnalysis = useMemo(() => {
    if (!startDate || !endDate || !currentEmp) return null;
    try {
      return analyzeSingleVacationRequest(
        {
          ...request,
          startDate,
          endDate,
          daysCount,
        },
        currentEmp
      );
    } catch {
      return null;
    }
  }, [startDate, endDate, daysCount, currentEmp, request]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setErrorMessage('Debes indicar una fecha de inicio y de fin.');
      return;
    }
    if (endDate < startDate) {
      setErrorMessage('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    if (daysCount <= 0) {
      setErrorMessage('El cómputo de días debe ser al menos 1.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const selectedEmp = employees.find((emp) => emp.id === selectedUserId);
      const updates: Partial<TimeOffRequest> = {
        userId: selectedUserId,
        userName: selectedEmp ? selectedEmp.fullName : request.userName,
        department: selectedEmp?.department || request.department || 'General',
        leaveType,
        startDate,
        endDate,
        daysCount: Number(daysCount),
        status,
        notes: notes.trim(),
        reviewedBy: reviewedBy.trim() || undefined,
      };

      await onSave(request.id, updates);
      onClose();
    } catch (err: any) {
      console.error('Error updating vacation:', err);
      setErrorMessage(err?.message || 'Error al guardar las modificaciones.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(request.id);
      onClose();
    } catch (err: any) {
      console.error('Error deleting vacation:', err);
      setErrorMessage(err?.message || 'Error al eliminar el registro de vacaciones.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 sm:p-7 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-slate-900">
                  Modificar Vacaciones / Permiso
                </h3>
                {/* Temporal badge */}
                {isPast ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span>🕒 Disfrutada (Pasada)</span>
                  </span>
                ) : isFuture ? (
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span>📅 Prevista (Futura)</span>
                  </span>
                ) : isCurrent ? (
                  <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span>⚡ En curso hoy</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Edita las fechas, los días computados o elimina este periodo del calendario y del historial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-2xl mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Employee selection (editable by Admin) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Empleado Asignado
              </label>
              {isAdmin ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800">
                  {request.userName}
                </div>
              )}
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de Ausencia / Permiso
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as TimeOffRequest['leaveType'])}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Vacaciones">Vacaciones</option>
                <option value="Asuntos Propios">Asuntos Propios</option>
                <option value="Días Personales">Días Personales</option>
                <option value="Baja Médica">Baja Médica</option>
              </select>
            </div>
          </div>

          {/* Dates: Start & End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Primer día del periodo</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Último día del periodo (inclusive)</span>
            </div>
          </div>

          {/* Days Count & Recalculate helper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Días Computados
                </label>
                <button
                  type="button"
                  onClick={handleRecalculateDays}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  title="Calcular días según convenio y régimen del empleado"
                >
                  🔄 Recalcular por fechas
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={daysCount}
                  onChange={(e) => setDaysCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-28 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-sm font-mono"
                />
                <span className="text-xs text-slate-500 font-semibold">
                  {daysCount === 1 ? 'día consumido' : 'días consumidos'} del saldo anual
                </span>
              </div>
            </div>

            {/* Status (Approved vs Pending vs Rejected) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado de la Solicitud
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatus('APROBADO')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                    status === 'APROBADO'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✓ Aprobada
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('PENDIENTE')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                    status === 'PENDIENTE'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ⏳ Pendiente
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('RECHAZADO')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                    status === 'RECHAZADO'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✕ Rechazada
                </button>
              </div>
            </div>
          </div>

          {/* Live Weekend Analysis Preview */}
          {liveAnalysis && (
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl text-[11px] text-purple-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <span>
                  <strong>Cómputo Fines de Semana:</strong>{' '}
                  {liveAnalysis.fullWeekendsCount} fin(es) de semana completo(s)
                  {liveAnalysis.workingSaturdaysCount > 0 && ` • ${liveAnalysis.workingSaturdaysCount} Sábado(s) Laborable(s)`}
                  {liveAnalysis.offSaturdaysCount > 0 && ` • ${liveAnalysis.offSaturdaysCount} Sábado(s) Libre(s)`}
                </span>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                Regla 4 FDS
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observaciones / Justificación
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del cambio, acuerdo verbal o notas internas de RRHH..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Delete button (with confirmation) */}
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {isDeleting ? 'Eliminando...' : '⚠️ Sí, borrar definitivamente'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Eliminar este registro</span>
                </button>
              )}
            </div>

            {/* Save and Cancel buttons */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{isSaving ? 'Guardando...' : 'Guardar Modificaciones'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
