import React, { useState } from 'react';
import { EmployeeRecord, CompanySettings } from '../types';
import { UserAvatar } from './UserAvatar';

interface EmployeeInviteModalProps {
  employee: EmployeeRecord;
  companySettings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
  onMarkInvited: (method: 'whatsapp' | 'email' | 'manual') => void;
}

export const EmployeeInviteModal: React.FC<EmployeeInviteModalProps> = ({
  employee,
  companySettings,
  isOpen,
  onClose,
  onMarkInvited,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'link'>('whatsapp');

  if (!isOpen) return null;

  const appOrigin = window.location.origin;
  const companyName = companySettings.companyName || 'Nuestra Empresa';
  const directLoginLink = `${appOrigin}/?email=${encodeURIComponent(employee.email)}`;

  const inviteMessage = `👋 ¡Hola ${employee.fullName}!

Te damos la bienvenida a ${companyName}.
Ya puedes registrar tu jornada laboral oficial y consultar tus turnos desde nuestra aplicación de control horario:

🚀 Enlace de Acceso Directo (1 Clic):
${directLoginLink}

📋 Tu información de empleado:
• Empresa: ${companyName}
• Nombre: ${employee.fullName}
• Email registrado: ${employee.email}
• Departamento: ${employee.department}
• Jornada: ${employee.weeklyHours}h / semana
• Rol: ${employee.role === 'admin' ? '👑 Administrador / RRHH' : '👤 Empleado'}

📱 Consejo: Guarda o añade la página a la pantalla de inicio de tu teléfono para fichar en un solo toque al entrar y salir del trabajo.

Atentamente,
Equipo de Recursos Humanos • ${companyName}`;

  const cleanPhone = (employee.phone || '').replace(/[^0-9]/g, '');
  const whatsappPhone =
    cleanPhone.length === 9 ? `34${cleanPhone}` : cleanPhone.length > 9 ? cleanPhone : '';

  const whatsappUrl = whatsappPhone
    ? `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(inviteMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage)}`;

  const emailSubject = `Invitación al Registro de Jornada de ${companyName}`;
  const emailUrl = `mailto:${employee.email}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(inviteMessage)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    onMarkInvited('manual');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLinkOnly = () => {
    navigator.clipboard.writeText(directLoginLink);
    setCopiedLink(true);
    onMarkInvited('manual');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsApp = () => {
    onMarkInvited('whatsapp');
    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = () => {
    onMarkInvited('email');
    window.location.href = emailUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-2xl">send</span>
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-900 leading-tight">
                Invitar a {employee.fullName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Envía el enlace de acceso directo para que entre a fichar sin contraseñas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="my-5 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 rounded-2xl p-4 border border-indigo-100/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={employee.fullName}
              size="lg"
              rounded="2xl"
              showBorder
              borderColor="border-indigo-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-sm text-slate-900">{employee.fullName}</h4>
                {employee.role === 'admin' && (
                  <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-700 font-semibold mt-0.5">{employee.email}</p>
              <p className="text-[10px] text-slate-500">{employee.department} • {employee.jobTitle}</p>
            </div>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            ● Listo para invitar
          </span>
        </div>

        {/* 1-Click Magic Link Box */}
        <div className="mb-5 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-indigo-600">link</span>
              Enlace de Acceso Directo (1 Clic)
            </span>
            <button
              onClick={handleCopyLinkOnly}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {copiedLink ? 'done' : 'content_copy'}
              </span>
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>
          <p className="font-mono text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200 truncate select-all">
            {directLoginLink}
          </p>
        </div>

        {/* Channel Selection Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base text-indigo-600">mail</span>
            <span>Email</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base text-slate-700">description</span>
            <span>Mensaje</span>
          </button>
        </div>

        {/* Tab 1: WhatsApp */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950">
              <div className="flex items-center gap-2 mb-1 font-bold text-emerald-800">
                <span className="material-symbols-outlined text-base text-emerald-600">phone_iphone</span>
                <span>Teléfono: {employee.phone || 'No registrado'}</span>
              </div>
              <p className="text-[11px] text-emerald-800/80">
                Abre WhatsApp con el mensaje personalizado y el enlace de acceso directo listo para enviar.
              </p>
            </div>

            <button
              onClick={handleWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-emerald-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">send</span>
              <span>Abrir en WhatsApp y Enviar Invitación</span>
            </button>
          </div>
        )}

        {/* Tab 2: Email */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950">
              <div className="flex items-center gap-2 mb-1 font-bold text-indigo-800">
                <span className="material-symbols-outlined text-base text-indigo-600">mail</span>
                <span>Email: {employee.email}</span>
              </div>
              <p className="text-[11px] text-indigo-800/80">
                Abre tu cliente de correo (Gmail, Outlook) con la bienvenida y el enlace redactados.
              </p>
            </div>

            <button
              onClick={handleEmail}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">send</span>
              <span>Enviar por Correo Electrónico</span>
            </button>
          </div>
        )}

        {/* Tab 3: Full Message Preview */}
        {activeTab === 'link' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                readOnly
                rows={6}
                value={inviteMessage}
                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl font-sans text-xs text-slate-700 focus:outline-none resize-none"
              />
              <button
                onClick={handleCopyText}
                className="absolute top-2.5 right-2.5 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <button
              onClick={handleCopyText}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              <span>{copied ? '✓ ¡Texto de Invitación Copiado!' : 'Copiar Mensaje Completo'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {employee.invitationSentAt
              ? `Última invitación: ${new Date(employee.invitationSentAt).toLocaleDateString()}`
              : 'Aún no se ha enviado invitación'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-600 font-bold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
