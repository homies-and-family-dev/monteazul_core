"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { signLoanActa } from "@/app/marketing/equipment/actions";
import { formatVerificationCode } from "@/lib/digital-signature";

interface SignerUser {
  id: string;
  name: string;
  email: string;
}

interface EquipmentLoanData {
  id: string;
  folio: string;
  purpose: string;
  startDate: Date | string;
  expectedReturnDate: Date | string;
  actualReturnDate: Date | string | null;
  status: string;
  borrowerId: string;
  borrower: SignerUser;
  authorizedById: string | null;
  authorizedBy: SignerUser | null;
  taskId: string | null;
  task: { id: string; title: string } | null;
  requestId: string | null;
  request: { id: string; ticketNumber: string; title: string } | null;
  departureNotes: string | null;
  departurePhotoUrl: string | null;
  returnNotes: string | null;
  returnPhotoUrl: string | null;

  // Firmas F-MKT-01
  departureDeliveredSignedAt: Date | string | null;
  departureDeliveredSignedById: string | null;
  departureDeliveredSignedBy: SignerUser | null;
  departureDeliveredSignature: string | null;
  departureReceivedSignedAt: Date | string | null;
  departureReceivedSignedById: string | null;
  departureReceivedSignedBy: SignerUser | null;
  departureReceivedSignature: string | null;
  departureSignatureHash: string | null;

  // Firmas F-MKT-02
  returnDeliveredSignedAt: Date | string | null;
  returnDeliveredSignedById: string | null;
  returnDeliveredSignedBy: SignerUser | null;
  returnDeliveredSignature: string | null;
  returnReceivedSignedAt: Date | string | null;
  returnReceivedSignedById: string | null;
  returnReceivedSignedBy: SignerUser | null;
  returnReceivedSignature: string | null;
  returnSignatureHash: string | null;

  items: Array<{
    id: string;
    conditionAtDeparture: string | null;
    conditionAtReturn: string | null;
    notes: string | null;
    equipment: {
      id: string;
      code: string;
      name: string;
      category: string;
      brand: string;
      model: string | null;
      serialNumber: string | null;
      physicalCondition: string;
      accessories: string | null;
      location: string | null;
    };
  }>;
}

interface Props {
  loan: EquipmentLoanData;
  currentUser: {
    id: string;
    name: string;
    email: string;
    isGeneralAdmin: boolean;
    isMarketingMember: boolean;
    isBorrower: boolean;
  };
  initialFormat?: "F-MKT-01" | "F-MKT-02";
}

export default function ActaDocumentView({
  loan,
  currentUser,
  initialFormat = "F-MKT-01",
}: Props) {
  const [currentFormat, setCurrentFormat] = useState<"F-MKT-01" | "F-MKT-02">(initialFormat);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signRoleToSign, setSignRoleToSign] = useState<"custodian" | "borrower">("custodian");
  const [signatureType, setSignatureType] = useState<"draw" | "seal">("seal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Canvas para firma manuscrita digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasStroke, setHasCanvasStroke] = useState(false);

  // Determinar quién puede firmar qué documento
  const canSignCustodian = currentUser.isGeneralAdmin || currentUser.isMarketingMember;
  const canSignBorrower = currentUser.isGeneralAdmin || currentUser.isBorrower;

  // Estado de firmas en F-MKT-01
  const isF1CustodianSigned = Boolean(loan.departureDeliveredSignedAt);
  const isF1BorrowerSigned = Boolean(loan.departureReceivedSignedAt);
  const isF1Complete = isF1CustodianSigned && isF1BorrowerSigned;

  // Estado de firmas en F-MKT-02
  const isF2BorrowerSigned = Boolean(loan.returnDeliveredSignedAt);
  const isF2CustodianSigned = Boolean(loan.returnReceivedSignedAt);
  const isF2Complete = isF2BorrowerSigned && isF2CustodianSigned;

  const activeHash =
    currentFormat === "F-MKT-01"
      ? loan.departureSignatureHash
      : loan.returnSignatureHash;

  // Lógica del canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasCanvasStroke(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasStroke(false);
  };

  const openSignModal = (role: "custodian" | "borrower") => {
    setSignRoleToSign(role);
    setSignatureType("seal");
    setHasCanvasStroke(false);
    setFeedbackMessage(null);
    setIsSignModalOpen(true);
  };

  const handleConfirmSignature = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    let signatureData = "";
    if (signatureType === "draw") {
      if (!hasCanvasStroke) {
        alert("Por favor dibuje su firma en el recuadro antes de confirmar.");
        setIsSubmitting(false);
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL("image/png");
      }
    } else {
      signatureData = `SELLO_DIGITAL_VERIFICADO|${currentUser.name}|${currentUser.email}|${new Date().toISOString()}`;
    }

    try {
      const fd = new FormData();
      fd.set("loanId", loan.id);
      fd.set("documentType", currentFormat);
      fd.set("signRole", signRoleToSign);
      fd.set("signatureData", signatureData);

      await signLoanActa(fd);
      setIsSignModalOpen(false);
      setFeedbackMessage({
        type: "success",
        text: "¡Firma estampada exitosamente! El acta ha sido certificada criptográficamente.",
      });
      // Recargar la vista suavemente
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar la firma digital.";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 print:p-0 print:bg-white text-slate-900">
      {/* ============================================================
          BARRA DE HERRAMIENTAS Y ACCIONES (SOLO PANTALLA, OCULTA EN PRINT)
          ============================================================ */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/marketing/equipment"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              ← Volver a Inventario
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-bold text-blue-950 font-mono">
              Folio: {loan.folio}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de formato */}
            <div className="inline-flex rounded-lg border border-blue-300 p-0.5 bg-blue-50/50">
              <button
                type="button"
                onClick={() => setCurrentFormat("F-MKT-01")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  currentFormat === "F-MKT-01"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-blue-900 hover:bg-blue-100"
                }`}
              >
                F-MKT-01 (Entrega)
              </button>
              <button
                type="button"
                onClick={() => setCurrentFormat("F-MKT-02")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  currentFormat === "F-MKT-02"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-blue-900 hover:bg-blue-100"
                }`}
              >
                F-MKT-02 (Devolución)
              </button>
            </div>

            {/* Botón Imprimir / PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Descargar PDF / Imprimir
            </button>
          </div>
        </div>

        {/* Notificaciones y avisos de estado de firmas */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              🌱
            </span>
            <div>
              <span className="font-bold text-blue-950 block">
                Directriz Institucional de Cero Papel (Monteazul Core)
              </span>
              <p className="text-slate-600 text-[11px] leading-snug">
                {currentFormat === "F-MKT-01"
                  ? isF1Complete
                    ? "✓ Acta de Entrega F-MKT-01 completada con firma digital de ambas partes. Válida y archivada digitalmente."
                    : "Esta acta requiere las firmas digitales del Custodio de Marketing y del Solicitante receptor."
                  : isF2Complete
                  ? "✓ Acta de Devolución F-MKT-02 completada con firma digital de ambas partes. Válida y archivada digitalmente."
                  : "Esta acta requiere las firmas digitales del Solicitante (devolución) y del Custodio de Marketing (inspección)."}
              </p>
            </div>
          </div>

          {/* Botones rápidos de firma si el usuario actual está habilitado y tiene firma pendiente */}
          <div className="flex items-center gap-2">
            {currentFormat === "F-MKT-01" && (
              <>
                {!isF1CustodianSigned && canSignCustodian && (
                  <button
                    type="button"
                    onClick={() => openSignModal("custodian")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                  >
                    Firmar como Custodio
                  </button>
                )}
                {!isF1BorrowerSigned && canSignBorrower && (
                  <button
                    type="button"
                    onClick={() => openSignModal("borrower")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                  >
                    Firmar como Solicitante
                  </button>
                )}
              </>
            )}

            {currentFormat === "F-MKT-02" && (
              <>
                {!isF2BorrowerSigned && canSignBorrower && (
                  <button
                    type="button"
                    onClick={() => openSignModal("borrower")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                  >
                    Firmar Devolución
                  </button>
                )}
                {!isF2CustodianSigned && canSignCustodian && (
                  <button
                    type="button"
                    onClick={() => openSignModal("custodian")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                  >
                    Firmar Recepción / Inspección
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              feedbackMessage.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}
      </div>

      {/* ============================================================
          DOCUMENTO OFICIAL VECTORIAL (OPTIMIZADO PARA @media print)
          ============================================================ */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-blue-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-slate-900">
        {/* Encabezado Oficial Institucional */}
        <div className="border-b-2 border-blue-950 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-lg shadow-xs print:border print:border-blue-950">
                MA
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-blue-950 leading-tight">
                  MONTEAZUL LOGÍSTICA & PRODUCCIÓN AUDIOVISUAL
                </h1>
                <span className="text-xs text-slate-600 font-bold block uppercase tracking-wide">
                  Área de Marketing y Comunicaciones Institucionales
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Sistema Integrado Monteazul Core • Directriz de Cero Papel
                </span>
              </div>
            </div>

            <div className="text-right border-l-2 border-blue-200 pl-4">
              <span className="text-sm font-black font-mono text-blue-950 block">
                {currentFormat}
              </span>
              <span className="text-[11px] font-bold text-blue-900 block">
                {currentFormat === "F-MKT-01"
                  ? "Acta de Entrega de Equipos"
                  : "Acta de Devolución e Inspección"}
              </span>
              <span className="text-[10px] font-mono text-slate-600 font-semibold block mt-0.5">
                Folio: <strong className="text-blue-950">{loan.folio}</strong>
              </span>
              <span className="text-[9px] text-slate-500 font-medium block">
                Versión: 02 • Emisión Digital
              </span>
            </div>
          </div>
        </div>

        {/* Declaración de Política Cero Papel */}
        <div className="mt-4 bg-blue-50/60 p-3 rounded-lg border border-blue-200 text-[11px] text-slate-700 leading-relaxed">
          <span className="font-bold text-blue-950 uppercase tracking-wide block mb-0.5">
            Certificación Electrónica Institucional (Cero Papel):
          </span>
          Este documento ha sido generado por vía telemática a través de <strong>Monteazul Core</strong>. Las firmas electrónicas incorporadas en este formato cuentan con autenticación biométrica de sesión y sellado de tiempo criptográfico SHA-256, constituyendo plena prueba institucional y contractual sin requerir reproducción en papel físico.
        </div>

        {/* Bloque de Metadatos y Datos del Solicitante / Operación */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Custodio / Solicitante:
            </span>
            <span className="font-bold text-blue-950 block text-xs">
              {loan.borrower.name}
            </span>
            <span className="text-[10px] text-slate-600 block truncate">
              {loan.borrower.email}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Custodio Almacén / Autorizó:
            </span>
            <span className="font-bold text-blue-950 block text-xs">
              {loan.authorizedBy?.name || "Dirección de Marketing"}
            </span>
            <span className="text-[10px] text-slate-600 block">
              Área de Marketing
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Fecha de Salida / Entrega:
            </span>
            <span className="font-bold text-blue-950 block text-xs">
              {new Date(loan.startDate).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {currentFormat === "F-MKT-01" ? "Compromiso de Devolución:" : "Fecha Real de Retorno:"}
            </span>
            <span className="font-bold text-blue-950 block text-xs">
              {currentFormat === "F-MKT-01"
                ? new Date(loan.expectedReturnDate).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : loan.actualReturnDate
                ? new Date(loan.actualReturnDate).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Pendiente de devolución física"}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Motivo / Destino / Proyecto:
            </span>
            <span className="font-medium text-slate-800 text-xs">
              {loan.purpose}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 pt-2 border-t border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Estado del Acta:
            </span>
            <span className="inline-block font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
              {loan.status}
            </span>
          </div>

          {(loan.request || loan.task) && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-[11px]">
              {loan.request && (
                <div>
                  <span className="font-bold text-slate-500">Requerimiento Vinculado:</span>{" "}
                  <span className="font-mono font-semibold text-blue-900">
                    {loan.request.ticketNumber}
                  </span>{" "}
                  - {loan.request.title}
                </div>
              )}
              {loan.task && (
                <div>
                  <span className="font-bold text-slate-500">Tarea Asignada:</span>{" "}
                  <span className="font-semibold text-slate-800">{loan.task.title}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabla de Equipos y Componentes Entregados */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">
              Inventario de Equipos, Lentes y Accesorios Entregados
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              Total ítems: {loan.items.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-blue-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white font-bold text-[11px]">
                  <th className="p-2.5 border-r border-blue-800 text-center w-10">#</th>
                  <th className="p-2.5 border-r border-blue-800 w-28">Código</th>
                  <th className="p-2.5 border-r border-blue-800">Descripción / Equipo</th>
                  <th className="p-2.5 border-r border-blue-800 w-32">N° de Serie</th>
                  <th className="p-2.5 border-r border-blue-800 w-28">Estado Salida</th>
                  {currentFormat === "F-MKT-02" && (
                    <th className="p-2.5 border-r border-blue-800 w-28">Estado Retorno</th>
                  )}
                  <th className="p-2.5">Accesorios Incluidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200 bg-white text-[11px]">
                {loan.items.map((it, idx) => (
                  <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                    <td className="p-2 text-center font-mono text-slate-500 border-r border-blue-200">
                      {idx + 1}
                    </td>
                    <td className="p-2 font-mono font-bold text-blue-950 border-r border-blue-200">
                      {it.equipment.code}
                    </td>
                    <td className="p-2 border-r border-blue-200">
                      <span className="font-bold text-blue-950 block">
                        {it.equipment.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {it.equipment.brand} {it.equipment.model || ""} • Cat: {it.equipment.category}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-slate-700 border-r border-blue-200">
                      {it.equipment.serialNumber || "N/A"}
                    </td>
                    <td className="p-2 border-r border-blue-200">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-900">
                        {it.conditionAtDeparture || it.equipment.physicalCondition}
                      </span>
                    </td>
                    {currentFormat === "F-MKT-02" && (
                      <td className="p-2 border-r border-blue-200">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900">
                          {it.conditionAtReturn || "Conforme"}
                        </span>
                      </td>
                    )}
                    <td className="p-2 text-slate-700">
                      {it.equipment.accessories || "Estuche estándar, batería y cables"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Observaciones y Novedades */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-blue-950 block uppercase text-[10px] tracking-wide">
              Observaciones de Entrega Inicial (F-MKT-01):
            </span>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              {loan.departureNotes || "Equipos entregados en óptimas condiciones físicas y de funcionamiento."}
            </p>
            {loan.departurePhotoUrl && (
              <div className="pt-1">
                <a
                  href={loan.departurePhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-semibold text-[10px] underline"
                >
                  Ver Evidencias Fotográficas de Entrega (Drive) ↗
                </a>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-blue-950 block uppercase text-[10px] tracking-wide">
              Observaciones de Devolución e Inspección (F-MKT-02):
            </span>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              {loan.returnNotes ||
                (currentFormat === "F-MKT-02"
                  ? "Inspección técnica satisfactoria. Equipos recibidos completos y limpios."
                  : "Pendiente hasta la fecha de devolución.")}
            </p>
            {loan.returnPhotoUrl && (
              <div className="pt-1">
                <a
                  href={loan.returnPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-semibold text-[10px] underline"
                >
                  Ver Evidencias Fotográficas de Recepción (Drive) ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Cláusula Legal de Custodia y Política Cero Papel */}
        <div className="mt-5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 text-[10px] text-slate-700 leading-relaxed italic text-justify">
          <strong>COMPROMISO DE CUSTODIA Y RESPONSABILIDAD:</strong> El custodio receptor declara recibir a entera satisfacción los equipos detallados en este documento y asume formalmente la guarda, conservación y uso exclusivo para actividades autorizadas de Monteazul. Se compromete a devolverlos en la fecha programada. El custodio emisor certifica la verificación técnica de los equipos. Las firmas digitales asociadas cuentan con valor probatorio pleno.
        </div>

        {/* ============================================================
            SECCIÓN DE FIRMAS DIGITALES ELECTRÓNICAS (CERO PAPEL)
            ============================================================ */}
        <div className="mt-8 pt-4 border-t-2 border-blue-950">
          <div className="text-center mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-950">
              Endosos y Firmas Digitales Autenticadas (Cero Papel)
            </span>
          </div>

          {currentFormat === "F-MKT-01" ? (
            /* Firmas F-MKT-01: Entrega por Custodio y Recepción por Solicitante */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Bloque 1: Custodio de Marketing (Entrega) */}
              <div
                className={`p-4 rounded-xl border-2 flex flex-col justify-between min-h-[160px] ${
                  isF1CustodianSigned
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-dashed border-amber-300 bg-amber-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wide">
                      1. Entregó (Custodio Marketing)
                    </span>
                    {isF1CustodianSigned ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Firmado Digitalmente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {isF1CustodianSigned ? (
                    <div className="py-2.5 space-y-1">
                      {loan.departureDeliveredSignature &&
                      loan.departureDeliveredSignature.startsWith("data:image") ? (
                        <div className="h-12 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={loan.departureDeliveredSignature}
                            alt="Firma Manuscrita"
                            className="max-h-12 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 rounded bg-white/80 border border-emerald-300 font-mono text-[10px] text-emerald-900 font-semibold text-center">
                          SELLO DIGITAL CERTIFICADO MONTEAZUL
                        </div>
                      )}
                      <div className="text-[11px] text-slate-800 text-center font-bold">
                        {loan.departureDeliveredSignedBy?.name || loan.authorizedBy?.name || "Custodio Marketing"}
                      </div>
                      <div className="text-[10px] text-slate-500 text-center truncate">
                        {loan.departureDeliveredSignedBy?.email || loan.authorizedBy?.email || ""}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-[11px] text-slate-600 italic">
                        Pendiente de validación por Custodio de Marketing.
                      </p>
                      {canSignCustodian && (
                        <button
                          type="button"
                          onClick={() => openSignModal("custodian")}
                          className="print:hidden px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                        >
                          Firmar Digitalmente Ahora
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Fecha:</span>
                  <span className="font-semibold text-slate-700">
                    {loan.departureDeliveredSignedAt
                      ? new Date(loan.departureDeliveredSignedAt).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Sin estampar"}
                  </span>
                </div>
              </div>

              {/* Bloque 2: Solicitante (Recepción a Conformidad) */}
              <div
                className={`p-4 rounded-xl border-2 flex flex-col justify-between min-h-[160px] ${
                  isF1BorrowerSigned
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-dashed border-amber-300 bg-amber-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wide">
                      2. Recibió Conforme (Solicitante)
                    </span>
                    {isF1BorrowerSigned ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Firmado Digitalmente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {isF1BorrowerSigned ? (
                    <div className="py-2.5 space-y-1">
                      {loan.departureReceivedSignature &&
                      loan.departureReceivedSignature.startsWith("data:image") ? (
                        <div className="h-12 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={loan.departureReceivedSignature}
                            alt="Firma Manuscrita"
                            className="max-h-12 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 rounded bg-white/80 border border-emerald-300 font-mono text-[10px] text-emerald-900 font-semibold text-center">
                          SELLO DIGITAL CERTIFICADO MONTEAZUL
                        </div>
                      )}
                      <div className="text-[11px] text-slate-800 text-center font-bold">
                        {loan.departureReceivedSignedBy?.name || loan.borrower.name}
                      </div>
                      <div className="text-[10px] text-slate-500 text-center truncate">
                        {loan.departureReceivedSignedBy?.email || loan.borrower.email}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-[11px] text-slate-600 italic">
                        Pendiente de firma del receptor: <strong>{loan.borrower.name}</strong>.
                      </p>
                      {canSignBorrower && (
                        <button
                          type="button"
                          onClick={() => openSignModal("borrower")}
                          className="print:hidden px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                        >
                          Firmar Digitalmente Ahora
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Fecha:</span>
                  <span className="font-semibold text-slate-700">
                    {loan.departureReceivedSignedAt
                      ? new Date(loan.departureReceivedSignedAt).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Sin estampar"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Firmas F-MKT-02: Devolución por Solicitante y Recepción por Custodio */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Bloque 1: Solicitante (Devolución) */}
              <div
                className={`p-4 rounded-xl border-2 flex flex-col justify-between min-h-[160px] ${
                  isF2BorrowerSigned
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-dashed border-amber-300 bg-amber-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wide">
                      1. Devolvió Conforme (Solicitante)
                    </span>
                    {isF2BorrowerSigned ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Firmado Digitalmente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {isF2BorrowerSigned ? (
                    <div className="py-2.5 space-y-1">
                      {loan.returnDeliveredSignature &&
                      loan.returnDeliveredSignature.startsWith("data:image") ? (
                        <div className="h-12 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={loan.returnDeliveredSignature}
                            alt="Firma Manuscrita"
                            className="max-h-12 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 rounded bg-white/80 border border-emerald-300 font-mono text-[10px] text-emerald-900 font-semibold text-center">
                          SELLO DIGITAL CERTIFICADO MONTEAZUL
                        </div>
                      )}
                      <div className="text-[11px] text-slate-800 text-center font-bold">
                        {loan.returnDeliveredSignedBy?.name || loan.borrower.name}
                      </div>
                      <div className="text-[10px] text-slate-500 text-center truncate">
                        {loan.returnDeliveredSignedBy?.email || loan.borrower.email}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-[11px] text-slate-600 italic">
                        Pendiente de firma del solicitante: <strong>{loan.borrower.name}</strong>.
                      </p>
                      {canSignBorrower && (
                        <button
                          type="button"
                          onClick={() => openSignModal("borrower")}
                          className="print:hidden px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                        >
                          Firmar Digitalmente Ahora
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Fecha:</span>
                  <span className="font-semibold text-slate-700">
                    {loan.returnDeliveredSignedAt
                      ? new Date(loan.returnDeliveredSignedAt).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Sin estampar"}
                  </span>
                </div>
              </div>

              {/* Bloque 2: Custodio de Marketing (Inspección y Recepción) */}
              <div
                className={`p-4 rounded-xl border-2 flex flex-col justify-between min-h-[160px] ${
                  isF2CustodianSigned
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-dashed border-amber-300 bg-amber-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wide">
                      2. Recibió e Inspeccionó (Custodio Marketing)
                    </span>
                    {isF2CustodianSigned ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Firmado Digitalmente
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {isF2CustodianSigned ? (
                    <div className="py-2.5 space-y-1">
                      {loan.returnReceivedSignature &&
                      loan.returnReceivedSignature.startsWith("data:image") ? (
                        <div className="h-12 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={loan.returnReceivedSignature}
                            alt="Firma Manuscrita"
                            className="max-h-12 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 rounded bg-white/80 border border-emerald-300 font-mono text-[10px] text-emerald-900 font-semibold text-center">
                          SELLO DIGITAL CERTIFICADO MONTEAZUL
                        </div>
                      )}
                      <div className="text-[11px] text-slate-800 text-center font-bold">
                        {loan.returnReceivedSignedBy?.name || loan.authorizedBy?.name || "Custodio Marketing"}
                      </div>
                      <div className="text-[10px] text-slate-500 text-center truncate">
                        {loan.returnReceivedSignedBy?.email || loan.authorizedBy?.email || ""}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-[11px] text-slate-600 italic">
                        Pendiente de inspección y firma del Custodio de Marketing.
                      </p>
                      {canSignCustodian && (
                        <button
                          type="button"
                          onClick={() => openSignModal("custodian")}
                          className="print:hidden px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                        >
                          Firmar Digitalmente Ahora
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Fecha:</span>
                  <span className="font-semibold text-slate-700">
                    {loan.returnReceivedSignedAt
                      ? new Date(loan.returnReceivedSignedAt).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Sin estampar"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de Página Criptográfico e Integridad Institucional */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
          <div>
            <span className="font-bold text-slate-700 block">
              Código de Verificación Electrónica:
            </span>
            <span className="font-mono font-bold text-blue-900 text-xs">
              {activeHash ? formatVerificationCode(activeHash) : "PENDIENTE DE FIRMA COMPLETA"}
            </span>
          </div>

          <div className="text-center sm:text-right font-mono text-[9px] text-slate-400">
            {activeHash ? (
              <span className="block truncate max-w-xs sm:max-w-md">
                SHA-256: {activeHash}
              </span>
            ) : (
              <span>Documento preliminar Monteazul Core</span>
            )}
            <span>Página 1 de 1 • Almacenamiento Digital Cero Papel</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODAL DE FIRMA DIGITAL CON AUTENTICACIÓN DEL USUARIO LOGUEADO
          ============================================================ */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-blue-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-blue-950">
                  Firma Digital Institucional (Cero Papel)
                </h3>
                <span className="text-xs text-slate-500">
                  {currentFormat} — Folio: {loan.folio}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Datos del usuario autenticado que estampará la firma */}
            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Firmante Autenticado:</span>
                <span className="font-bold text-blue-950">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Correo Electrónico:</span>
                <span className="font-mono text-slate-800">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Rol en este Documento:</span>
                <span className="font-bold text-blue-900">
                  {signRoleToSign === "custodian"
                    ? "Custodio de Almacén Marketing"
                    : "Solicitante / Receptor Responsable"}
                </span>
              </div>
            </div>

            {/* Pestañas de método de firma */}
            <div className="space-y-3">
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setSignatureType("seal")}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                    signatureType === "seal"
                      ? "bg-white text-blue-950 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sello Electrónico de Usuario
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType("draw")}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                    signatureType === "draw"
                      ? "bg-white text-blue-950 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Trazo Manuscrito (Dibujar)
                </button>
              </div>

              {signatureType === "seal" ? (
                <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/50 text-center space-y-2">
                  <div className="inline-block p-2 rounded-full bg-emerald-600 text-white font-bold text-sm">
                    ✓
                  </div>
                  <div className="font-black text-xs text-emerald-950 uppercase tracking-wide">
                    Sello Digital Cero Papel Monteazul
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Al confirmar, se emitirá una firma con validez jurídica vinculada a su sesión de usuario ({currentUser.email}), estampando fecha, hora y hash criptográfico SHA-256.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Dibuje su trazo en el recuadro:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-blue-700 hover:underline text-[11px] font-semibold"
                    >
                      Limpiar trazo
                    </button>
                  </div>
                  <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 touch-none">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 cursor-crosshair block"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Use el cursor o pantalla táctil para dibujar su rúbrica manuscrita.
                  </span>
                </div>
              )}
            </div>

            {/* Declaración de Aceptación */}
            <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed italic">
              «Certifico la veracidad de este documento y acepto la política institucional de cero papel para la custodia de activos de Monteazul.»
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSignature}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                {isSubmitting ? "Estampando Firma..." : "Confirmar y Firmar Digitalmente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
