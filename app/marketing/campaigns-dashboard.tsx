"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createMarketingCampaign,
  updateMarketingCampaign,
  updateCampaignStatus,
} from "./actions";

export interface CampaignItem {
  id: string;
  code: string;
  name: string;
  brand: string;
  projectName: string | null;
  objective: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  budget: number;
  spent: number;
  targetAudience: string | null;
  channels: string;
  description: string | null;
  expectedKpis: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  _count: {
    contents: number;
  };
}

export interface UpcomingContentItem {
  id: string;
  brand: string;
  date: Date;
  title: string;
  format: string;
  objective: string;
  platforms: string;
  status: string;
  assignedTo: {
    name: string;
  } | null;
}

export interface MarketingDashboardMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  inPlanningCampaigns: number;
  finishedCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalContentsMonth: number;
  publishedContents: number;
  totalEquipment: number;
  availableEquipment: number;
  activeLoans: number;
}

interface Props {
  campaigns: CampaignItem[];
  upcomingContents: UpcomingContentItem[];
  projects: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
  metrics: MarketingDashboardMetrics;
  userName: string;
  canManage: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; borderClass: string; dotClass: string }
> = {
  Activa: {
    label: "Activa",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  Planificación: {
    label: "En Planificación",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    borderClass: "border-sky-200",
    dotClass: "bg-sky-500",
  },
  Pausada: {
    label: "Pausada",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500",
  },
  Finalizada: {
    label: "Finalizada",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-200",
    borderClass: "border-purple-200",
    dotClass: "bg-purple-500",
  },
  Cancelada: {
    label: "Cancelada",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200",
    borderClass: "border-rose-200",
    dotClass: "bg-rose-500",
  },
};

const BRANDS = [
  "Monte Azul Inmobiliaria",
  "Monteazul Group",
  "Monte Azul Constructora",
  "Proyectos Monte Azul",
];

const OBJECTIVES = [
  "Lanzamiento Inmobiliario & Ventas",
  "Generación de Leads Calificados",
  "Branding & Reconocimiento",
  "Conversión y Cierres de Separación",
  "Eventos y Activaciones de Marca",
  "Posicionamiento Web & Tráfico",
];

const COMMON_CHANNELS = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Vallas Viales",
  "WhatsApp Marketing",
  "Prensa & Revistas",
  "Eventos Presenciales",
  "Email Marketing",
  "YouTube / Video",
];

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CampaignsDashboard({
  campaigns,
  upcomingContents,
  projects,
  availableUsers,
  metrics,
  userName,
  canManage,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Channels state for Create modal
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    "Meta Ads",
    "Google Ads",
  ]);

  // Channels state for Edit modal
  const [editChannels, setEditChannels] = useState<string[]>([]);

  // Filtrado de campañas
  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus === "active") {
      if (c.status !== "Activa") return false;
    } else if (filterStatus === "planning") {
      if (c.status !== "Planificación") return false;
    } else if (filterStatus === "finished") {
      if (c.status !== "Finalizada") return false;
    } else if (filterStatus !== "all" && c.status !== filterStatus) {
      return false;
    }

    if (filterBrand !== "all" && c.brand !== filterBrand) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchProject = c.projectName?.toLowerCase().includes(q) ?? false;
      const matchObjective = c.objective.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchProject && !matchObjective) {
        return false;
      }
    }

    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("channels", selectedChannels.join(", "));

    startTransition(async () => {
      try {
        await createMarketingCampaign(formData);
        setMessage({
          type: "success",
          text: "¡Campaña de Marketing creada exitosamente!",
        });
        setShowCreateModal(false);
        form.reset();
        setSelectedChannels(["Meta Ads", "Google Ads"]);
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al crear la campaña.",
        });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("channels", editChannels.join(", "));

    startTransition(async () => {
      try {
        await updateMarketingCampaign(editingCampaign.id, formData);
        setMessage({
          type: "success",
          text: "¡Campaña actualizada exitosamente!",
        });
        setEditingCampaign(null);
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al actualizar la campaña.",
        });
      }
    });
  };

  const handleStatusChange = (campaignId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateCampaignStatus(campaignId, newStatus);
        setMessage({
          type: "success",
          text: `Estado de la campaña actualizado a "${newStatus}".`,
        });
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al cambiar de estado.",
        });
      }
    });
  };

  const openEditModal = (c: CampaignItem) => {
    setEditingCampaign(c);
    const channelsArr = c.channels
      ? c.channels.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    setEditChannels(channelsArr);
  };

  const toggleChannelSelection = (
    channel: string,
    current: string[],
    setter: (val: string[]) => void
  ) => {
    if (current.includes(channel)) {
      setter(current.filter((c) => c !== channel));
    } else {
      setter([...current, channel]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificación de Éxito / Error */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline cursor-pointer hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Cabecera del Tablero de Campañas */}
      <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">
              Tablero y Campañas de Marketing
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Módulo Exclusivo de Marketing
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Bienvenido/a, <span className="font-semibold text-blue-950">{userName}</span>. Gestión integral y exclusiva de campañas publicitarias, lanzamientos inmobiliarios, pauta digital y presupuesto de mercadeo de Monte Azul.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Campaña
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas Clave (KPIs de Campañas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Campañas Activas */}
        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Campañas Activas
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-950">
              {metrics.activeCampaigns}
            </span>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              {metrics.inPlanningCampaigns} en planificación
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalCampaigns} campañas totales registradas
          </p>
        </div>

        {/* Presupuesto Total vs Ejecutado */}
        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Inversión Presupuestada
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-950 truncate">
              {formatCOP(metrics.totalBudget)}
            </span>
            <span className="text-[11px] font-bold text-emerald-700">
              {metrics.totalBudget > 0
                ? `${Math.round((metrics.totalSpent / metrics.totalBudget) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all"
              style={{
                width: `${
                  metrics.totalBudget > 0
                    ? Math.min(100, Math.round((metrics.totalSpent / metrics.totalBudget) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Ejecutado: <strong className="text-slate-800">{formatCOP(metrics.totalSpent)}</strong>
          </p>
        </div>

        {/* Publicaciones del Mes */}
        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Publicaciones del Mes
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-950">
              {metrics.totalContentsMonth}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {metrics.publishedContents} publicadas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Parrilla editorial en redes y canales
          </p>
        </div>

        {/* Equipos en Campo / Préstamos */}
        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Equipos en Campo / Préstamos
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-950">
              {metrics.activeLoans}
            </span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {metrics.availableEquipment} de {metrics.totalEquipment} disponibles
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Control de actas F-MKT-01 y F-MKT-02
          </p>
        </div>
      </div>

      {/* Grid Principal: 8 columnas Campañas de Marketing / 4 columnas Parrilla y Equipos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Listado Exclusivo de Campañas (8 columnas) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                Campañas Publicitarias ({filteredCampaigns.length})
              </h2>

              {/* Filtros de Estado */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("active")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    filterStatus === "active"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Activas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("planning")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    filterStatus === "planning"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  En Planificación
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("finished")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    filterStatus === "finished"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Finalizadas
                </button>
              </div>
            </div>

            {/* Búsqueda y Filtro de Marca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, nombre, proyecto u objetivo..."
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">Todas las marcas</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Listado de Tarjetas de Campañas */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="bg-white p-10 rounded-xl border border-dashed border-blue-300 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  No se encontraron campañas de marketing con los filtros seleccionados.
                </p>
                {canManage && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold shadow-xs hover:bg-blue-800 cursor-pointer"
                  >
                    + Crear Nueva Campaña
                  </button>
                )}
              </div>
            ) : (
              filteredCampaigns.map((c) => {
                const statusMeta = STATUS_CONFIG[c.status] || {
                  label: c.status,
                  badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
                  borderClass: "border-slate-200",
                  dotClass: "bg-slate-500",
                };

                const channelsList = c.channels
                  ? c.channels.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];

                const executionPercent =
                  c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl border border-blue-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all space-y-4"
                  >
                    {/* Fila Superior: Código, Estado, Marca y Fechas */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {c.code}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${statusMeta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                            {statusMeta.label}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {c.brand}
                          </span>

                          {c.projectName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-950 border border-blue-100">
                              Proyecto: {c.projectName}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-950 mt-1.5">
                          {c.name}
                        </h3>

                        <p className="text-xs text-blue-800 font-medium mt-0.5">
                          Objetivo: <span className="font-semibold text-slate-800">{c.objective}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          Inicio:{" "}
                          <strong className="text-slate-900">
                            {new Date(c.startDate).toLocaleDateString("es-CO")}
                          </strong>
                        </span>
                        {c.endDate && (
                          <span className="text-[11px] text-slate-500 block">
                            Fin:{" "}
                            <strong className="text-slate-800">
                              {new Date(c.endDate).toLocaleDateString("es-CO")}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Descripción y Segmentación */}
                    {c.description && (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {c.description}
                      </p>
                    )}

                    {/* KPIs y Audiencia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-[10px] block">
                          Público Objetivo
                        </span>
                        <span className="text-slate-800 font-medium">
                          {c.targetAudience || "No especificado"}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-500 uppercase text-[10px] block">
                          Metas / KPIs Esperados
                        </span>
                        <span className="text-slate-800 font-medium">
                          {c.expectedKpis || "Por definir"}
                        </span>
                      </div>
                    </div>

                    {/* Canales Publicitarios */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Canales:</span>
                      {channelsList.map((ch) => (
                        <span
                          key={ch}
                          className="text-[10px] font-semibold bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md shadow-2xs"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>

                    {/* Presupuesto y Ejecución */}
                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">
                            Presupuesto: <strong className="text-slate-900">{formatCOP(c.budget)}</strong>
                          </span>
                          <span className="text-slate-600 font-medium">
                            Ejecutado: <strong className="text-blue-900">{formatCOP(c.spent)}</strong> ({executionPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              executionPercent > 90 ? "bg-amber-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${executionPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="shrink-0 text-right sm:pl-4 border-t sm:border-t-0 sm:border-l border-blue-200 pt-2 sm:pt-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Responsable
                        </span>
                        <span className="text-xs font-bold text-blue-950">
                          {c.assignedTo?.name || "Sin asignar"}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Acciones */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="px-3 py-1 rounded-md bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Editar Campaña
                          </button>
                        )}

                        {canManage && (
                          <select
                            value={c.status}
                            disabled={isPending}
                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Planificación">Planificación</option>
                            <option value="Activa">Activa</option>
                            <option value="Pausada">Pausada</option>
                            <option value="Finalizada">Finalizada</option>
                            <option value="Cancelada">Cancelada</option>
                          </select>
                        )}
                      </div>

                      <Link
                        href="/marketing/calendar"
                        className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        Ver Calendario de Contenidos →
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Parrilla Editorial Próxima y Equipos Audiovisuales (4 columnas) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Parrilla Editorial Próxima */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                Parrilla Editorial Próxima
              </h2>
              <Link
                href="/marketing/calendar"
                className="text-[11px] font-bold text-blue-700 hover:underline"
              >
                Ver Todo
              </Link>
            </div>

            <div className="space-y-2.5">
              {upcomingContents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No hay publicaciones programadas próximamente.
                </p>
              ) : (
                upcomingContents.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                        {item.brand}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {new Date(item.date).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.title}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-blue-100/60">
                      <span>{item.format}</span>
                      <span className="text-[10px] text-blue-900 font-semibold truncate max-w-[120px]">
                        {item.platforms}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Control de Equipos Audiovisuales */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                Control de Equipos
              </h2>
              <Link
                href="/marketing/equipment"
                className="text-[11px] font-bold text-blue-700 hover:underline"
              >
                Inventario
              </Link>
            </div>

            <p className="text-xs text-slate-600">
              Gestión de cámaras, drones, ópticas y micrófonos con actas de entrega F-MKT-01 y devolución F-MKT-02.
            </p>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-lg font-extrabold text-emerald-800">
                  {metrics.availableEquipment}
                </div>
                <div className="text-[10px] font-bold text-emerald-900">
                  Disponibles
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-lg font-extrabold text-blue-800">
                  {metrics.activeLoans}
                </div>
                <div className="text-[10px] font-bold text-blue-900">
                  En Préstamo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CREAR NUEVA CAMPAÑA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-blue-950">
                  Nueva Campaña de Marketing
                </h3>
                <p className="text-xs text-slate-600">
                  Creación directa de campaña para el módulo de mercadeo y publicidad
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Ej: Lanzamiento Campestre Altos del Este"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Marca Corporativa *
                  </label>
                  <select
                    name="brand"
                    required
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proyecto de Interés */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Proyecto Inmobiliario Asociado
                  </label>
                  <select
                    name="projectName"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Ninguno / Institucional</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Objetivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Objetivo Principal *
                  </label>
                  <select
                    name="objective"
                    required
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado Inicial */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Estado Inicial
                  </label>
                  <select
                    name="status"
                    defaultValue="Planificación"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Planificación">Planificación</option>
                    <option value="Activa">Activa</option>
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Fecha Fin Estimada
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Presupuesto */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Presupuesto Asignado ($ COP)
                  </label>
                  <input
                    type="number"
                    name="budget"
                    defaultValue={0}
                    step={100000}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Presupuesto Ejecutado Inicial ($ COP)
                  </label>
                  <input
                    type="number"
                    name="spent"
                    defaultValue={0}
                    step={50000}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Responsable */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Líder o Responsable de Campaña
                  </label>
                  <select
                    name="assignedToId"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccionar responsable...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Canales (Multi-select) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Canales Publicitarios Seleccionados *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CHANNELS.map((ch) => {
                      const isSelected = selectedChannels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() =>
                            toggleChannelSelection(ch, selectedChannels, setSelectedChannels)
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                            isSelected
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? `✓ ${ch}` : `+ ${ch}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Público Objetivo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Público Objetivo / Segmentación
                  </label>
                  <input
                    type="text"
                    name="targetAudience"
                    placeholder="Ej: Inversionistas y familias, 30-55 años, Ibagué y Bogotá, estratos 4-6"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Concepto Creativo y Descripción
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Resumen del mensaje comercial, propuesta de valor y estrategia..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* KPIs Esperados */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Metas / Indicadores Esperados (KPIs)
                  </label>
                  <input
                    type="text"
                    name="expectedKpis"
                    placeholder="Ej: 150 leads calificados, 30 visitas al proyecto, 8 contratos cerrados"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear Campaña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CAMPAÑA */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-blue-950">
                  Editar Campaña: {editingCampaign.code}
                </h3>
                <p className="text-xs text-slate-600">
                  Actualización de detalles, presupuesto ejecutado y métricas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingCampaign.name}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Marca Corporativa *
                  </label>
                  <select
                    name="brand"
                    required
                    defaultValue={editingCampaign.brand}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proyecto de Interés */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Proyecto Inmobiliario Asociado
                  </label>
                  <select
                    name="projectName"
                    defaultValue={editingCampaign.projectName || ""}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Ninguno / Institucional</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Objetivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Objetivo Principal *
                  </label>
                  <select
                    name="objective"
                    required
                    defaultValue={editingCampaign.objective}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Estado de la Campaña
                  </label>
                  <select
                    name="status"
                    defaultValue={editingCampaign.status}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Planificación">Planificación</option>
                    <option value="Activa">Activa</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Finalizada">Finalizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={new Date(editingCampaign.startDate).toISOString().split("T")[0]}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Fecha Fin Estimada
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={
                      editingCampaign.endDate
                        ? new Date(editingCampaign.endDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Presupuesto */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Presupuesto Asignado ($ COP)
                  </label>
                  <input
                    type="number"
                    name="budget"
                    defaultValue={editingCampaign.budget}
                    step={100000}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Presupuesto Ejecutado ($ COP)
                  </label>
                  <input
                    type="number"
                    name="spent"
                    defaultValue={editingCampaign.spent}
                    step={50000}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Responsable */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Líder o Responsable de Campaña
                  </label>
                  <select
                    name="assignedToId"
                    defaultValue={editingCampaign.assignedTo?.id || ""}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccionar responsable...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Canales (Multi-select) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Canales Publicitarios Seleccionados *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CHANNELS.map((ch) => {
                      const isSelected = editChannels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() =>
                            toggleChannelSelection(ch, editChannels, setEditChannels)
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                            isSelected
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? `✓ ${ch}` : `+ ${ch}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Público Objetivo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Público Objetivo / Segmentación
                  </label>
                  <input
                    type="text"
                    name="targetAudience"
                    defaultValue={editingCampaign.targetAudience || ""}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Concepto Creativo y Descripción
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={editingCampaign.description || ""}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* KPIs Esperados */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Metas / Indicadores Esperados (KPIs)
                  </label>
                  <input
                    type="text"
                    name="expectedKpis"
                    defaultValue={editingCampaign.expectedKpis || ""}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
