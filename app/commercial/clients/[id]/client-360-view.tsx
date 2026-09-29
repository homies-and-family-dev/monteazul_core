"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/number-to-words";
import { updateCommercialClientAction, ClientFormData } from "../actions";
import { TimelineEvent } from "@/lib/commercial-clients";

interface Props {
  data: {
    client: any;
    relatedProjects: string[];
    totalQuoted: number;
    totalContracted: number;
    totalReservationPaid: number;
    timeline: TimelineEvent[];
  };
  advisors: Array<{ id: string; name: string; email: string }>;
}

const CIVIL_STATUS_OPTIONS = [
  "Soltero(a)",
  "Casado(a)",
  "Unión Libre",
  "Divorciado(a)",
  "Viudo(a)",
];

const DOC_TYPES = ["CC", "CE", "NIT", "Pasaporte"];

export default function Client360View({ data, advisors }: Props) {
  const router = useRouter();
  const { client, relatedProjects, totalQuoted, totalContracted, totalReservationPaid, timeline } = data;

  const [activeTab, setActiveTab] = useState<"TIMELINE" | "VISITS" | "QUOTES" | "CONTRACTS" | "PROFILE">("TIMELINE");

  // Edición de perfil
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<ClientFormData>({
    name: client.name,
    docType: client.docType || "CC",
    docNumber: client.docNumber || "",
    phone: client.phone,
    email: client.email || "",
    address: client.address || "",
    city: client.city || "Colombia",
    civilStatus: client.civilStatus || "Soltero(a)",
    bank: client.bank || "",
    occupation: client.occupation || "",
    notes: client.notes || "",
    assignedAdvisorId: client.assignedAdvisorId || "",
  });

  const whatsappPhone = client.phone.replace(/[^0-9]/g, "");

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEditError("");

    const res = await updateCommercialClientAction(client.id, editForm);
    setSubmitting(false);

    if (!res.success) {
      setEditError(res.error || "Error al actualizar.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Barra de navegación superior */}
      <div className="flex items-center justify-between">
        <Link
          href="/commercial/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Directorio de Clientes
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/commercial/quotes"
            className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cotización
          </Link>
          <Link
            href="/commercial/schedule"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Agendar Visita
          </Link>
        </div>
      </div>

      {/* Tarjeta Principal de Perfil del Cliente */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
              {client.name
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {client.docType} {client.docNumber || "Sin documento"}
                </span>
                {client.civilStatus && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                    {client.civilStatus}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{client.phone}</span>
                {client.email && <span>{client.email}</span>}
                {client.city && <span>{client.city}</span>}
                {client.address && <span className="text-slate-500">{client.address}</span>}
              </div>

              {/* Botón WhatsApp directo */}
              <div className="pt-1 flex items-center gap-3">
                <a
                  href={`https://wa.me/57${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  Chatear por WhatsApp
                </a>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditing ? "Cancelar Edición" : "Editar Ficha"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-center space-y-1 text-right">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Asesor Comercial
            </span>
            <span className="text-sm font-bold text-slate-900">
              {client.assignedAdvisor?.name || "Sin asesor asignado"}
            </span>
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {relatedProjects.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">Sin proyectos asociados</span>
              ) : (
                relatedProjects.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200"
                  >
                    {p}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Formulario de edición si se activa */}
        {isEditing && (
          <form onSubmit={handleEditSubmit} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Modificar Información Jurídica y de Contacto
            </h3>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Documento Identificación</label>
                <div className="flex gap-2">
                  <select
                    value={editForm.docType}
                    onChange={(e) => setEditForm({ ...editForm, docType: e.target.value })}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-2"
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editForm.docNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, docNumber: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dirección de Domicilio</label>
                <input
                  type="text"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ciudad / País</label>
                <input
                  type="text"
                  value={editForm.city || ""}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Estado Civil</label>
                <select
                  value={editForm.civilStatus || "Soltero(a)"}
                  onChange={(e) => setEditForm({ ...editForm, civilStatus: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                >
                  {CIVIL_STATUS_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cuenta Bancaria</label>
                <input
                  type="text"
                  placeholder="Banco y número..."
                  value={editForm.bank || ""}
                  onChange={(e) => setEditForm({ ...editForm, bank: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Asesor Asignado</label>
                <select
                  value={editForm.assignedAdvisorId || ""}
                  onChange={(e) => setEditForm({ ...editForm, assignedAdvisorId: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Sin Asignar</option>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitting ? "Actualizando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        )}

        {/* Resumen de Cifras del Cliente */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Visitas a Terreno
            </span>
            <span className="text-xl font-bold text-indigo-950 mt-0.5 block">
              {client.bookings.length}
            </span>
            <span className="text-[10px] text-slate-400">Coordinadas con asesor</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Cotizaciones Emitidas
            </span>
            <span className="text-xl font-bold text-blue-950 mt-0.5 block">
              {client.quotes.length}
            </span>
            <span className="text-[10px] text-slate-400">
              Total: {formatCurrency(totalQuoted)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Contratos de Separación
            </span>
            <span className="text-xl font-bold text-emerald-950 mt-0.5 block">
              {client.contracts.length}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">
              Formalizados oficialmente
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Separación Recaudada
            </span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">
              {formatCurrency(totalReservationPaid)}
            </span>
            <span className="text-[10px] text-slate-400">
              Total negocio: {formatCurrency(totalContracted)}
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Expediente */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("TIMELINE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "TIMELINE"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Trazabilidad y Línea de Tiempo ({timeline.length})
        </button>

        <button
          onClick={() => setActiveTab("VISITS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "VISITS"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Visitas a Terreno ({client.bookings.length})
        </button>

        <button
          onClick={() => setActiveTab("QUOTES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "QUOTES"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Cotizaciones ({client.quotes.length})
        </button>

        <button
          onClick={() => setActiveTab("CONTRACTS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "CONTRACTS"
              ? "bg-blue-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Contratos de Separación ({client.contracts.length})
        </button>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}

      {/* PESTAÑA 1: TIMELINE DE TRAZABILIDAD */}
      {activeTab === "TIMELINE" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Línea de Tiempo y Trazabilidad Comercial
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial cronológico de interacciones, agendamientos, propuestas y formalizaciones.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {timeline.length} evento(s) registrado(s)
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No se han registrado eventos comerciales aún.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-blue-200 space-y-8 my-2">
              {timeline.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Punto en la línea de tiempo */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-blue-700 shadow-xs" />

                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${event.badgeColor}`}>
                          {event.status}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">{event.title}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {event.date.toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {event.description}
                    </p>

                    {event.link && (
                      <div className="pt-1">
                        <Link
                          href={event.link}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900"
                        >
                          {event.linkText || "Ver detalle"} →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: VISITAS A TERRENO */}
      {activeTab === "VISITS" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Visitas a Proyectos y Agendamientos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Coordinación de visitas a terreno, transporte y seguimiento comercial.
              </p>
            </div>
            <Link
              href="/commercial/schedule"
              className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs"
            >
              + Nueva Visita en Agenda
            </Link>
          </div>

          {client.bookings.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              El cliente no tiene visitas agendadas en terreno todavía.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {client.bookings.map((b: any) => (
                <div key={b.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{b.project}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {b.status}
                      </span>
                      {b.transportNeed && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800">
                          Requiere Transporte
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">
                      Asistentes: {b.numAttendees} · Asesor: {b.assignedAdvisor?.name || "Sin asignar"}
                    </div>
                    {b.feedbackNotes && (
                      <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                        Feedback: {b.feedbackNotes}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-900">
                      {new Date(b.date).toLocaleDateString("es-CO", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-[11px] text-blue-700 font-medium">
                      {new Date(b.date).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: COTIZACIONES */}
      {activeTab === "QUOTES" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Cotizaciones Emitidas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial de propuestas comerciales generadas para este cliente.
              </p>
            </div>
            <Link
              href="/commercial/quotes"
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              + Nueva Cotización
            </Link>
          </div>

          {client.quotes.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No se han emitido cotizaciones para este cliente aún.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {client.quotes.map((q: any) => (
                <div key={q.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{q.consecutive}</span>
                      <span className="font-semibold text-blue-900">{q.projectName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === "CONTRATADA" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {q.lotNumber} ({q.stage || "Etapa 1"} - {q.block || "Manzana A"}) · {q.totalArea} m²
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Emitida el {new Date(q.createdAt).toLocaleDateString("es-CO")} · Asesor: {q.advisor?.name || "Monteazul"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(q.finalPrice)}
                      </div>
                      <div className="text-[10px] text-emerald-800 font-semibold">
                        Sep: {formatCurrency(q.reservationAmount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/commercial/quotes/${q.id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-[11px]"
                      >
                        Ver Documento
                      </Link>
                      {q.contract && (
                        <Link
                          href={`/commercial/contracts/${q.contract.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px]"
                        >
                          Ver Contrato
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: CONTRATOS DE SEPARACIÓN */}
      {activeTab === "CONTRACTS" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Contratos de Separación Oficiales
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instrumentos jurídicos de reserva vinculados directamente a las cotizaciones validadas de este cliente.
            </p>
          </div>

          {client.contracts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              El cliente aún no tiene contratos de separación formalizados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {client.contracts.map((c: any) => (
                <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{c.contractNumber}</span>
                      <span className="font-semibold text-emerald-950">{c.projectName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {c.lotNumber} ({c.stage} - {c.block}) · {c.totalArea} m²
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Fecha: {new Date(c.date).toLocaleDateString("es-CO")} · Vinculado a Cotización: {c.quote?.consecutive}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(c.totalPrice)}
                      </div>
                      <div className="text-[10px] text-emerald-800 font-semibold">
                        Separación: {formatCurrency(c.reservationAmount)}
                      </div>
                    </div>

                    <Link
                      href={`/commercial/contracts/${c.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs"
                    >
                      Ver e Imprimir Contrato Oficial →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
