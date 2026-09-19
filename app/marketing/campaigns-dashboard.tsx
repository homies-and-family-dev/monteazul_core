"use client";

import { useState } from "react";
import Link from "next/link";
import { RequestStatus } from "@prisma/client";

export interface MarketingRequestItem {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: string;
  priority: string | null;
  status: RequestStatus;
  filedAt: Date;
  dueDate: Date | null;
  originArea: {
    name: string;
    code: string;
  };
  filedBy: {
    name: string;
  };
  assignments: Array<{
    user: {
      name: string;
    };
  }>;
  tasks: Array<{
    id: string;
    status: string;
  }>;
  _count: {
    comments: number;
    files: number;
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
  totalRequests: number;
  activeRequests: number;
  inProgressRequests: number;
  deliveredRequests: number;
  totalContentsMonth: number;
  publishedContents: number;
  totalEquipment: number;
  availableEquipment: number;
  activeLoans: number;
}

interface Props {
  requests: MarketingRequestItem[];
  upcomingContents: UpcomingContentItem[];
  metrics: MarketingDashboardMetrics;
  userName: string;
}

const STATUS_LABELS: Record<RequestStatus, { label: string; color: string }> = {
  FILED: { label: "Radicado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  ASSIGNED: { label: "Asignado", color: "bg-sky-100 text-sky-800 border-sky-200" },
  IN_PROGRESS: { label: "En Proceso", color: "bg-amber-100 text-amber-900 border-amber-200" },
  IN_REVIEW: { label: "En Revisión", color: "bg-purple-100 text-purple-900 border-purple-200" },
  RESUBMITTED: { label: "Reenviada", color: "bg-indigo-100 text-indigo-900 border-indigo-200" },
  DELIVERED: { label: "Entregado", color: "bg-teal-100 text-teal-900 border-teal-200" },
  RETURNED: { label: "Devuelto", color: "bg-rose-100 text-rose-900 border-rose-200" },
  PENDING_CONFIRMATION: { label: "Por Confirmar", color: "bg-yellow-100 text-yellow-900 border-yellow-200" },
  CLOSED: { label: "Cerrado", color: "bg-emerald-100 text-emerald-900 border-emerald-200" },
};

export default function CampaignsDashboard({
  requests,
  upcomingContents,
  metrics,
  userName,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Obtener lista única de tipos de requerimientos
  const availableTypes = Array.from(new Set(requests.map((r) => r.type)));

  // Filtrado de requerimientos
  const filteredRequests = requests.filter((r) => {
    if (filterStatus === "active") {
      if (r.status === "CLOSED") return false;
    } else if (filterStatus !== "all") {
      if (r.status !== filterStatus) return false;
    }

    if (filterType !== "all" && r.type !== filterType) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchTicket = r.ticketNumber.toLowerCase().includes(q);
      const matchFiler = r.filedBy.name.toLowerCase().includes(q);
      if (!matchTitle && !matchTicket && !matchFiler) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera del Tablero */}
      <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">
              Tablero y Campañas de Marketing
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Área de Marketing (MKT)
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Bienvenido/a, <span className="font-semibold text-blue-950">{userName}</span>. Gestión integral de requerimientos corporativos, producción de piezas publicitarias, calendario editorial e inventario técnico.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/marketing/calendar"
            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
          >
            📅 Calendario Editorial
          </Link>
          <Link
            href="/marketing/equipment"
            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
          >
            📦 Equipos y Préstamos
          </Link>
          <Link
            href="/requests/new"
            className="px-3.5 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-xs font-semibold shadow-xs transition-colors"
          >
            + Radicar Requerimiento
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave (KPIs de Marketing) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Requerimientos Activos
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-950">
              {metrics.activeRequests}
            </span>
            <span className="text-xs font-semibold text-blue-700">
              {metrics.inProgressRequests} en producción
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Solicitudes del Core canalizadas a Marketing
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Publicaciones del Mes
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-950">
              {metrics.totalContentsMonth}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              {metrics.publishedContents} publicadas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Parrilla editorial en redes sociales
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Equipos en Campo / Préstamos
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-950">
              {metrics.activeLoans}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {metrics.availableEquipment} de {metrics.totalEquipment} disponibles
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Control físico bajo actas F-MKT-01 y F-MKT-02
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Requerimientos Entregados
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600">
              {metrics.deliveredRequests}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {metrics.totalRequests} históricos
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Piezas y entregables completados
          </p>
        </div>
      </div>

      {/* Grid Principal: 8 columnas Requerimientos MKT / 4 columnas Próximas Publicaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Requerimientos de Campañas (8 columnas) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                Requerimientos y Campañas del Área ({filteredRequests.length})
              </h2>

              {/* Filtros de Estado */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus("active")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterStatus === "active"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterStatus === "all"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("IN_PROGRESS")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterStatus === "IN_PROGRESS"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  En Proceso
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("DELIVERED")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterStatus === "DELIVERED"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Entregados
                </button>
              </div>
            </div>

            {/* Búsqueda y Filtro de Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ticket, título o solicitante..."
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">Todos los tipos de campaña</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Requerimientos */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-blue-300 text-center text-xs text-slate-500 space-y-2">
                <p>No se encontraron requerimientos de Marketing con los filtros seleccionados.</p>
                <Link
                  href="/requests/new"
                  className="inline-block px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold text-xs"
                >
                  Radicar Primer Requerimiento
                </Link>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const statusMeta = STATUS_LABELS[req.status] || {
                  label: req.status,
                  color: "bg-slate-100 text-slate-800 border-slate-200",
                };

                const currentAssignee = req.assignments[0]?.user.name;
                const completedTasks = req.tasks.filter((t) => t.status === "completada").length;
                const totalTasks = req.tasks.length;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-blue-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {req.ticketNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          {req.priority && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {req.priority}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/requests/${req.id}`}
                          className="block text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors"
                        >
                          {req.title}
                        </Link>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-500 block">
                          Origen: <strong className="text-slate-800">{req.originArea.name}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(req.filedAt).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {req.description}
                    </p>

                    <div className="pt-2 border-t border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                        <span>
                          Tipo: <strong className="text-slate-800">{req.type}</strong>
                        </span>
                        <span>
                          Operador:{" "}
                          <strong className="text-blue-950">
                            {currentAssignee || "Sin asignar"}
                          </strong>
                        </span>
                        {totalTasks > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <span>Subtareas:</span>
                            <span className="text-blue-800">
                              {completedTasks}/{totalTasks}
                            </span>
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/requests/${req.id}`}
                        className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
                      >
                        Abrir Expediente →
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Próximas Publicaciones y Actividad Editorial (4 columnas) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                Parrilla Editorial Próxima
              </h2>
              <Link
                href="/marketing/calendar"
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900"
              >
                Ver Calendario →
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

            <div className="pt-2 border-t border-blue-100">
              <Link
                href="/marketing/calendar"
                className="block text-center w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Abrir Calendario Completo
              </Link>
            </div>
          </div>

          {/* Tarjeta de Equipos Audiovisuales */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                Control de Equipos
              </h2>
              <Link
                href="/marketing/equipment"
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900"
              >
                Inventario →
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

            <Link
              href="/marketing/equipment"
              className="block text-center w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              Gestionar Inventario y Préstamos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
