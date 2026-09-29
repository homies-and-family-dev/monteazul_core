"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCommercialClientAction, ClientFormData } from "./actions";
import { COMMERCIAL_PROJECTS } from "@/lib/commercial-projects";
import { formatCurrency } from "@/lib/number-to-words";

export interface ClientListItem {
  id: string;
  name: string;
  docType: string;
  docNumber: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  civilStatus: string | null;
  bank: string | null;
  occupation: string | null;
  notes: string | null;
  createdAt: Date | string;
  assignedAdvisor: { id: string; name: string } | null;
  bookingsCount: number;
  quotesCount: number;
  contractsCount: number;
  totalQuoted: number;
  totalContracted: number;
  projects: string[];
}

interface Props {
  initialClients: ClientListItem[];
  advisors: Array<{ id: string; name: string; email: string }>;
  currentUserId: string;
  projects?: Array<{ id: string; name: string }>;
}

const CIVIL_STATUS_OPTIONS = [
  "Soltero(a)",
  "Casado(a)",
  "Unión Libre",
  "Divorciado(a)",
  "Viudo(a)",
];

const DOC_TYPES = ["CC", "CE", "NIT", "Pasaporte"];

export default function ClientDirectoryView({
  initialClients,
  advisors,
  currentUserId,
  projects,
}: Props) {
  const router = useRouter();
  const projectList = projects && projects.length > 0 ? projects : COMMERCIAL_PROJECTS;
  const [clients, setClients] = useState<ClientListItem[]>(initialClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<"ALL" | "VISITS" | "QUOTES" | "CONTRACTS">("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");

  // Modal Nuevo Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [newClient, setNewClient] = useState<ClientFormData>({
    name: "",
    docType: "CC",
    docNumber: "",
    phone: "",
    email: "",
    address: "",
    city: "Colombia",
    civilStatus: "Soltero(a)",
    bank: "Bancolombia",
    occupation: "",
    notes: "",
    assignedAdvisorId: currentUserId,
  });

  // Filtros
  const filteredClients = clients.filter((c) => {
    if (filterStage === "VISITS" && c.bookingsCount === 0) return false;
    if (filterStage === "QUOTES" && c.quotesCount === 0) return false;
    if (filterStage === "CONTRACTS" && c.contractsCount === 0) return false;

    if (filterProject !== "ALL") {
      const hasProject = c.projects.some((p) =>
        p.toLowerCase().includes(filterProject.toLowerCase())
      );
      if (!hasProject) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDoc = (c.docNumber || "").toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchEmail = (c.email || "").toLowerCase().includes(q);
      const matchProj = c.projects.some((p) => p.toLowerCase().includes(q));
      if (!matchName && !matchDoc && !matchPhone && !matchEmail && !matchProj) return false;
    }

    return true;
  });

  // Métricas
  const totalClients = clients.length;
  const withVisits = clients.filter((c) => c.bookingsCount > 0).length;
  const withQuotes = clients.filter((c) => c.quotesCount > 0).length;
  const withContracts = clients.filter((c) => c.contractsCount > 0).length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    if (!newClient.name.trim() || !newClient.phone.trim()) {
      setFormError("El nombre y el teléfono son campos obligatorios.");
      setSubmitting(false);
      return;
    }

    const res = await createCommercialClientAction(newClient);
    setSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Ocurrió un error al guardar.");
      return;
    }

    setIsModalOpen(false);
    router.refresh();
    if (res.clientId) {
      router.push(`/commercial/clients/${res.clientId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              Base de Datos Unificada
            </span>
            <span className="text-xs text-slate-500">Módulo Comercial</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Directorio de Clientes y Trazabilidad Comercial
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Expedientes 360° con trazabilidad centralizada de agendamientos, propuestas de cotización, proyectos de interés y contratos de separación.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Clientes Unificados
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalClients}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">En base de datos comercial</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
            Con Visitas a Terreno
          </span>
          <p className="text-2xl font-bold text-indigo-950 mt-1">{withVisits}</p>
          <span className="text-[11px] text-indigo-700 mt-0.5 block">Interesados con agendamiento</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Con Cotizaciones
          </span>
          <p className="text-2xl font-bold text-blue-950 mt-1">{withQuotes}</p>
          <span className="text-[11px] text-blue-700 mt-0.5 block">Propuestas emitidas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Compradores / Contratados
          </span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{withContracts}</p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Con contrato de separación</span>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterStage("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              filterStage === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos ({totalClients})
          </button>
          <button
            onClick={() => setFilterStage("VISITS")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              filterStage === "VISITS"
                ? "bg-indigo-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Con Visitas ({withVisits})
          </button>
          <button
            onClick={() => setFilterStage("QUOTES")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              filterStage === "QUOTES"
                ? "bg-blue-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Con Cotización ({withQuotes})
          </button>
          <button
            onClick={() => setFilterStage("CONTRACTS")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              filterStage === "CONTRACTS"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Contratados ({withContracts})
          </button>
        </div>

        {/* Filtro por Proyecto y Búsqueda */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
          >
            <option value="ALL">Todos los Proyectos</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar cliente, cédula o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-blue-600"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron clientes</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Los clientes se crean automáticamente cuando se registra una visita o se emite una cotización, o puede registrarlos manualmente.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Registrar Cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cliente / Identificación</th>
                  <th className="px-4 py-3">Contacto Directo</th>
                  <th className="px-4 py-3">Proyectos de Interés</th>
                  <th className="px-4 py-3 text-center">Trazabilidad de Actividades</th>
                  <th className="px-4 py-3 text-right">Volumen Financiero</th>
                  <th className="px-4 py-3">Asesor Asignado</th>
                  <th className="px-4 py-3 text-right">Expediente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => {
                  const whatsappPhone = c.phone.replace(/[^0-9]/g, "");
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/commercial/clients/${c.id}`}
                          className="font-bold text-slate-900 hover:text-blue-700 block transition-colors"
                        >
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-slate-500">
                          {c.docNumber ? `${c.docType} ${c.docNumber}` : "Sin documento"}
                          {c.city && ` · ${c.city}`}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{c.phone}</span>
                          <a
                            href={`https://wa.me/57${whatsappPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold inline-flex items-center gap-1"
                            title="Chatear por WhatsApp"
                          >
                            WhatsApp
                          </a>
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={c.email}>
                            {c.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {c.projects.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Sin proyecto activo</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.projects.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                          <span
                            title="Visitas a Terreno"
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              c.bookingsCount > 0 ? "bg-indigo-100 text-indigo-800" : "text-slate-400"
                            }`}
                          >
                            {c.bookingsCount} Vis
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            title="Cotizaciones Emitidas"
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              c.quotesCount > 0 ? "bg-blue-100 text-blue-800" : "text-slate-400"
                            }`}
                          >
                            {c.quotesCount} Cot
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            title="Contratos de Separación"
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              c.contractsCount > 0 ? "bg-emerald-100 text-emerald-800" : "text-slate-400"
                            }`}
                          >
                            {c.contractsCount} Con
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {c.totalContracted > 0 ? (
                          <div>
                            <div className="font-bold text-emerald-900">
                              {formatCurrency(c.totalContracted)}
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Separación Firmada
                            </span>
                          </div>
                        ) : c.totalQuoted > 0 ? (
                          <div>
                            <div className="font-bold text-slate-800">
                              {formatCurrency(c.totalQuoted)}
                            </div>
                            <span className="text-[10px] text-blue-700">Cotizado</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-700">
                          {c.assignedAdvisor?.name || "Sin asesor"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/commercial/clients/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] shadow-xs transition-colors"
                        >
                          Expediente 360° →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR NUEVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Área Comercial
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Registrar Nuevo Cliente / Prospecto
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nombre Completo / Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Andrés Ramírez Gómez"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tipo y Documento de Identificación
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newClient.docType}
                      onChange={(e) => setNewClient({ ...newClient, docType: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-slate-900 w-24 shrink-0"
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Cédula / NIT"
                      value={newClient.docNumber || ""}
                      onChange={(e) => setNewClient({ ...newClient, docNumber: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 3154879654"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@correo.com"
                    value={newClient.email || ""}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ciudad de Residencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ibagué / Bogotá"
                    value={newClient.city || ""}
                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Estado Civil
                  </label>
                  <select
                    value={newClient.civilStatus || "Soltero(a)"}
                    onChange={(e) => setNewClient({ ...newClient, civilStatus: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    {CIVIL_STATUS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Asesor Comercial Asignado
                  </label>
                  <select
                    value={newClient.assignedAdvisorId || currentUserId}
                    onChange={(e) =>
                      setNewClient({ ...newClient, assignedAdvisorId: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    {advisors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notas y Perfil Comercial
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Preferencias de proyectos, presupuesto estimado, canal de contacto, etc."
                    value={newClient.notes || ""}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
