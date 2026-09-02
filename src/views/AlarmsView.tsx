import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlarmItem } from '../types';

export const AlarmsView: React.FC = () => {
  const { alarms, toggleAlarm, saveAlarm, deleteAlarm } = useApp();
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [alarmName, setAlarmName] = useState('Entrada Mañana');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('45');
  const [selectedDays, setSelectedDays] = useState<string[]>(['L', 'M', 'X', 'J', 'V']);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const daysList = [
    { key: 'L', label: 'L' },
    { key: 'M', label: 'M' },
    { key: 'X', label: 'X' },
    { key: 'J', label: 'J' },
    { key: 'V', label: 'V' },
    { key: 'S', label: 'S' },
    { key: 'D', label: 'D' },
  ];

  const handleOpenEdit = (alarm?: AlarmItem) => {
    if (alarm) {
      setEditingAlarm(alarm);
      setAlarmName(alarm.title);
      const [h, m] = alarm.time.split(':');
      setHour(h || '08');
      setMinute(m || '00');
      setSelectedDays(alarm.days);
      setSoundEnabled(alarm.soundEnabled);
      setVibrationEnabled(alarm.vibrationEnabled);
    } else {
      setEditingAlarm(null);
      setAlarmName('Recordatorio Fichaje');
      setHour('09');
      setMinute('00');
      setSelectedDays(['L', 'M', 'X', 'J', 'V']);
      setSoundEnabled(true);
      setVibrationEnabled(true);
    }
    setShowModal(true);
  };

  const handleToggleDay = (dayKey: string) => {
    if (selectedDays.includes(dayKey)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayKey));
    } else {
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const handleSaveAlarm = () => {
    const newAlarm: AlarmItem = {
      id: editingAlarm ? editingAlarm.id : `alarm-${Date.now()}`,
      title: alarmName,
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      days: selectedDays,
      active: true,
      soundEnabled,
      vibrationEnabled,
      pushEnabled: true,
      type: editingAlarm ? editingAlarm.type : 'custom',
    };
    saveAlarm(newAlarm);
    setShowModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div>
          <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            Mis Alarmas y Recordatorios
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configura avisos acústicos y notificaciones para no olvidar registrar tus entradas y pausas.
          </p>
        </div>
        <button
          onClick={() => handleOpenEdit()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-5 rounded-2xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add_alarm</span>
          Nueva Alarma
        </button>
      </div>

      {/* Alarms list */}
      <div className="grid grid-cols-1 gap-3.5">
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            className={`p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
              alarm.active ? 'bg-white' : 'bg-slate-50/70 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleOpenEdit(alarm)}
                className="text-left cursor-pointer group"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono font-black text-4xl text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {alarm.time}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {alarm.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex gap-1">
                    {daysList.map((d) => (
                      <span
                        key={d.key}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors ${
                          alarm.days.includes(d.key)
                            ? 'bg-indigo-50 text-indigo-700 font-black'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>

                  {alarm.soundEnabled && (
                    <span className="material-symbols-outlined text-base text-slate-400" title="Sonido activo">
                      volume_up
                    </span>
                  )}
                  {alarm.vibrationEnabled && (
                    <span className="material-symbols-outlined text-base text-slate-400" title="Vibración activa">
                      vibration
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Toggle Switch + Delete */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => deleteAlarm(alarm.id)}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                title="Eliminar alarma"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>

              {/* Modern Toggle */}
              <button
                onClick={() => toggleAlarm(alarm.id)}
                className={`w-14 h-8 p-1 rounded-full transition-colors cursor-pointer ${
                  alarm.active ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    alarm.active ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configure / Create Alarm Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold"
            >
              ✕
            </button>

            <h2 className="font-bold text-xl text-slate-900 tracking-tight mb-5">
              Configurar Alarma
            </h2>

            {/* Time Picker */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 mb-5 flex justify-center items-center gap-3">
              <input
                type="number"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="w-20 bg-white border border-slate-200 rounded-2xl text-center font-mono font-bold text-4xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
              />
              <span className="font-bold text-3xl text-slate-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="w-20 bg-white border border-slate-200 rounded-2xl text-center font-mono font-bold text-4xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
              />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Nombre del Recordatorio
              </label>
              <input
                type="text"
                value={alarmName}
                onChange={(e) => setAlarmName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Repetición de Días */}
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Repetir Días
              </label>
              <div className="flex justify-between gap-1">
                {daysList.map((d) => {
                  const isSelected = selectedDays.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => handleToggleDay(d.key)}
                      className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-700">Sonido de Campana</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-2.5">
                <span className="font-semibold text-xs text-slate-700">Vibración Háptica</span>
                <input
                  type="checkbox"
                  checked={vibrationEnabled}
                  onChange={(e) => setVibrationEnabled(e.target.checked)}
                  className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAlarm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-100 cursor-pointer"
              >
                Guardar Alarma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
