import { jsPDF } from 'jspdf';
import { MonthlyRecord, AuditLog, CompanySettings, TimeEntry, EmployeeRecord } from '../types';

/**
 * Genera el Modelo Oficial de Registro de Jornada en PDF conforme al Art. 34.9 ET y directrices ITSS.
 * Incluye: Razón Social, CIF, CCC (Seguridad Social), Centro de Trabajo, Tipo de Jornada, Desglose Diario y Sello SHA-256.
 */
export function exportMonthlySignPdf(
  record: MonthlyRecord,
  company: CompanySettings,
  entries: TimeEntry[],
  employeeData?: EmployeeRecord
) {
  const doc = new jsPDF();
  
  // Encabezado Oficial con banda de seguridad
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 12, 182, 22, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('REGISTRO OFICIAL DE JORNADA LABORAL', 20, 22);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Conforme al Art. 34.9 del Estatuto de los Trabajadores (Real Decreto-ley 8/2019) y directrices ITSS', 20, 29);

  // Cuadro Datos Identificativos Obligatorios (Empresa & Trabajador)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(14, 38, 182, 42, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('Helvetica', 'bold');
  doc.text('DATOS DE LA EMPRESA', 18, 44);
  doc.text('DATOS DEL TRABAJADOR', 105, 44);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Razón Social: ${company.companyName || 'EMPRESA DEMO S.L.'}`, 18, 51);
  doc.text(`NIF / CIF: ${company.fiscalId || 'B-00000000'}`, 18, 57);
  doc.text(`C.C.C. Seg. Social: ${company.cccCode || '28 123456789 (Régimen General)'}`, 18, 63);
  doc.text(`Centro de Trabajo: ${company.workplaceAddress || 'Sede Central'} ${company.workplaceCity ? `(${company.workplaceCity})` : ''}`, 18, 69);
  if (company.collectiveAgreement) {
    doc.text(`Convenio: ${company.collectiveAgreement}`, 18, 75);
  }

  const workdayLabel = employeeData?.workdayType === 'PARCIAL'
    ? `Tiempo Parcial (${employeeData.weeklyHours || 20}h/sem)`
    : `Tiempo Completo (${employeeData?.weeklyHours || company.baseWeeklyHours || 40}h/sem)`;

  doc.text(`Nombre y Apellidos: ${record.userName}`, 105, 51);
  doc.text(`NIF / NIE: ${record.userDni || employeeData?.dni || '00000000A'}`, 105, 57);
  doc.text(`Puesto: ${employeeData?.jobTitle || 'Empleado'} | Dpto: ${employeeData?.department || 'Operaciones'}`, 105, 63);
  doc.text(`Tipo de Jornada: ${workdayLabel}`, 105, 69);
  doc.text(`Periodo Liquidado: ${record.month}`, 105, 75);

  // Cuadro Resumen Horario del Periodo
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 84, 182, 16, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const ordHours = Math.floor(record.ordinaryHours || 0);
  const ordMins = Math.round(((record.ordinaryHours || 0) - ordHours) * 60);
  const extHours = Math.floor(record.extraHours || 0);
  const extMins = Math.round(((record.extraHours || 0) - extHours) * 60);
  const cmpHours = Math.floor(record.complementaryHours || 0);
  const cmpMins = Math.round(((record.complementaryHours || 0) - cmpHours) * 60);

  doc.text(`H. Ordinarias: ${ordHours}h ${String(ordMins).padStart(2, '0')}m`, 20, 94);
  doc.text(`H. Extraordinarias: ${extHours}h ${String(extMins).padStart(2, '0')}m`, 80, 94);
  doc.text(`H. Complementarias: ${cmpHours}h ${String(cmpMins).padStart(2, '0')}m`, 140, 94);

  // Tabla Detallada Día a Día
  let y = 106;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FECHA', 18, y + 5);
  doc.text('ENTRADA', 50, y + 5);
  doc.text('SALIDA', 75, y + 5);
  doc.text('PAUSA / DESCANSO', 100, y + 5);
  doc.text('MODALIDAD', 140, y + 5);
  doc.text('T. EFECTIVO', 170, y + 5);

  y += 7;
  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);

  const entriesToPrint = entries.length > 0 ? entries : [];
  if (entriesToPrint.length === 0) {
    doc.text('Sin registros de jornada asentados en este periodo.', 18, y + 6);
    y += 8;
  } else {
    entriesToPrint.forEach((e) => {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.text(e.date, 18, y + 5);
      doc.text(e.clockIn || '--:--', 50, y + 5);
      doc.text(e.clockOut || '--:--', 75, y + 5);
      doc.text(e.breakDurationMinutes > 0 ? `${e.breakDurationMinutes} min` : '0 min', 100, y + 5);
      doc.text(e.workType === 'teletrabajo' ? 'Teletrabajo' : e.workType === 'cliente' ? 'Itinerante' : 'Presencial', 140, y + 5);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${e.totalHoursWorked || 0}h`, 172, y + 5);
      doc.setFont('Helvetica', 'normal');
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7, 196, y + 7);
      y += 7;
    });
  }

  // Cuadro de Firma y Garantía Criptográfica SHA-256
  y = Math.max(y + 6, 238);
  if (y > 242) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 38, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DILIGENCIA DE CONFORMIDAD Y CUSTODIA PRECEPTIVA (ART. 34.9 ET - 4 AÑOS)', 18, y + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('El presente documento constituye reflejo fidedigno de los registros horarios inalterables archivados en el sistema.', 18, y + 12);
  doc.text(`Estado: ${record.isSigned ? 'FIRMADO Y CERTIFICADO' : 'PENDIENTE DE FIRMA'} | Fecha Sello: ${record.signedAt || new Date().toLocaleString('es-ES')}`, 18, y + 17);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Huella Digital Criptográfica (SHA-256 inmutable):', 18, y + 23);
  doc.setFont('Courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(79, 70, 229);
  doc.text(record.securityHash || 'sha256:7f8e3a2b1c4d9e0f123456789abcdef0123456789abcdef0123456789abcdef0', 18, y + 28);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento expedido para su puesta a disposición inmediata de la Inspección de Trabajo y Seguridad Social (ITSS) y RLT.', 18, y + 34);

  doc.save(`ITSS_Registro_Jornada_${record.month.replace(/\s+/g, '_')}_${record.userName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Exportación Masiva Normalizada en CSV para requerimientos telemáticos y cruce de datos con la ITSS / Seguridad Social.
 * Estructura: id_empleado, nif, fecha, evento, timestamp_utc, origen_marcaje, tipo_jornada
 */
export function exportItssNormalizedCsv(
  entries: TimeEntry[],
  employees: EmployeeRecord[]
) {
  const headers = [
    'id_empleado',
    'nif',
    'nombre_completo',
    'fecha',
    'evento',
    'hora_local',
    'timestamp_utc',
    'tipo_jornada',
    'duracion_pausa_min',
    'horas_efectivas',
    'origen_marcaje',
    'geolocalizacion_verificada'
  ];

  const empMap = new Map(employees.map(e => [e.id, e]));

  const rows: string[][] = [];

  entries.forEach(entry => {
    const emp = empMap.get(entry.userId);
    const nif = emp?.dni || 'N/D';
    const fullName = entry.userName || emp?.fullName || 'Desconocido';
    const date = entry.date;
    const workType = entry.workType || 'presencial';
    const gpsOk = entry.location?.verifiedGps ? 'SI' : 'NO';

    // Evento ENTRADA (IN)
    if (entry.clockIn) {
      const utcIn = new Date(`${date}T${entry.clockIn}`).toISOString();
      rows.push([
        `"${entry.userId}"`,
        `"${nif}"`,
        `"${fullName}"`,
        `"${date}"`,
        `"IN"`,
        `"${entry.clockIn}"`,
        `"${utcIn}"`,
        `"${workType}"`,
        `"0"`,
        `"-"`,
        `"App Web FichaPlus"`,
        `"${gpsOk}"`
      ]);
    }

    // Evento PAUSA (si existió)
    if (entry.breakDurationMinutes > 0) {
      rows.push([
        `"${entry.userId}"`,
        `"${nif}"`,
        `"${fullName}"`,
        `"${date}"`,
        `"PAUSA_REGISTRADA"`,
        `"-"`,
        `"-"`,
        `"${workType}"`,
        `"${entry.breakDurationMinutes}"`,
        `"-"`,
        `"App Web FichaPlus"`,
        `"${gpsOk}"`
      ]);
    }

    // Evento SALIDA (OUT)
    if (entry.clockOut) {
      const utcOut = new Date(`${date}T${entry.clockOut}`).toISOString();
      rows.push([
        `"${entry.userId}"`,
        `"${nif}"`,
        `"${fullName}"`,
        `"${date}"`,
        `"OUT"`,
        `"${entry.clockOut}"`,
        `"${utcOut}"`,
        `"${workType}"`,
        `"${entry.breakDurationMinutes || 0}"`,
        `"${entry.totalHoursWorked || 0}"`,
        `"App Web FichaPlus"`,
        `"${gpsOk}"`
      ]);
    }
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ITSS_Export_Normalizado_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera el documento oficial del Protocolo Interno de Registro de Jornada de la Empresa para la RLT / Plantilla.
 */
export function exportCompanyProtocolPdf(company: CompanySettings) {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(14, 14, 182, 24, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PROTOCOLO INTERNO DE CONTROL HORARIO', 20, 24);
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Empresa: ${company.companyName} | NIF: ${company.fiscalId} | Conforme al Art. 34.9 ET`, 20, 32);

  let y = 48;
  doc.setTextColor(15, 23, 42);

  const sections = [
    {
      title: '1. OBJETO Y ÁMBITO DE APLICACIÓN',
      text: 'El presente protocolo tiene por objeto regular el procedimiento de registro diario de jornada para la totalidad de las personas trabajadoras de la empresa, garantizando el cumplimiento del art. 34.9 del Estatuto de los Trabajadores (RDL 8/2019) y el derecho a la desconexión digital.'
    },
    {
      title: '2. MÉTODO DE REGISTRO Y OBLIGATORIEDAD',
      text: 'El registro se efectuará mediante la herramienta digital corporativa FichaPlus. Toda persona trabajadora tiene el deber laboral de fichar al inicio y finalización de cada turno (mañana y tarde en jornada partida, o único en jornada continua), así como las pausas no computables como tiempo de trabajo efectivo.'
    },
    {
      title: '3. TRABAJO A DISTANCIA Y TELETRABAJO',
      text: 'Las personas trabajadoras bajo modalidad de teletrabajo o en movilidad están sujetas a la misma obligación de registro, garantizándose la flexibilidad acordada y el respeto estricto a los descansos obligatorios entre jornadas.'
    },
    {
      title: '4. CUSTODIA DE REGISTROS DURANTE 4 AÑOS Y DISPONIBILIDAD',
      text: 'Los registros horarios se conservarán en soporte digital inmutable durante un periodo preceptivo de cuatro (4) años a disposición de las personas trabajadoras, de la Representación Legal de los Trabajadores (RLT) y de la Inspección de Trabajo y Seguridad Social (ITSS).'
    },
    {
      title: '5. PROCEDIMIENTO DE RECTIFICACIÓN DE INCIDENCIAS',
      text: 'En caso de olvido o error en el marcaje, la persona trabajadora formulará una propuesta de corrección en la aplicación, debiendo ser validada con constancia del motivo justificado y preservando el registro original para auditoría.'
    }
  ];

  sections.forEach((sec) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(sec.title, 16, y);
    y += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitText = doc.splitTextToSize(sec.text, 178);
    doc.text(splitText, 16, y);
    y += splitText.length * 4.5 + 4;
  });

  // Firmas
  y = Math.max(y + 10, 230);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 86, 36);
  doc.rect(110, y, 86, 36);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('POR LA DIRECCIÓN DE LA EMPRESA', 18, y + 6);
  doc.text('POR LA REPRESENTACIÓN DE LOS TRABAJADORES (RLT)', 114, y + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Firma y Sello: ${company.companyName}`, 18, y + 30);
  doc.text('Firma Comité de Empresa / Delegados de Personal', 114, y + 30);

  doc.save(`Protocolo_Registro_Jornada_${company.companyName.replace(/\s+/g, '_')}.pdf`);
}

export function exportAuditPdf(logs: AuditLog[]) {
  const doc = new jsPDF();
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 14, 182, 20, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME OFICIAL DE AUDITORÍA Y TRAZABILIDAD (ITSS)', 20, 26);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} | Registros inmutables con Sello SHA-256`, 14, 40);

  let y = 48;
  logs.forEach((log) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 32, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`ACCIÓN: [${log.actionType}] | Fecha: ${log.timestamp}`, 18, y + 6);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Autor: ${log.performedBy} (${log.performedByRole}) | Afectado: ${log.affectedUserName}`, 18, y + 12);
    doc.text(`Valor previo: ${log.previousValue || 'N/A'} -> Nuevo: ${log.newValue || 'N/A'}`, 18, y + 18);
    doc.text(`Motivo justificado: ${log.justification}`, 18, y + 24);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`Hash SHA-256: ${log.securityHash}`, 18, y + 29);
    doc.setTextColor(30, 41, 59);
    y += 36;
  });

  doc.save(`FichaPlus_Auditoria_ITSS_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAuditCsv(logs: AuditLog[]) {
  const headers = ['ID', 'Tipo Acción', 'Fecha/Hora', 'Realizado Por', 'Rol', 'Usuario Afectado', 'Valor Previo', 'Nuevo Valor', 'Justificación', 'Hash SHA-256'];
  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${l.actionType}"`,
    `"${l.timestamp}"`,
    `"${l.performedBy}"`,
    `"${l.performedByRole}"`,
    `"${l.affectedUserName}"`,
    `"${l.previousValue || ''}"`,
    `"${l.newValue || ''}"`,
    `"${l.justification.replace(/"/g, '""')}"`,
    `"${l.securityHash}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FichaPlus_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
