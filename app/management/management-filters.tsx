"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Area } from "@prisma/client";
import { ESTADOS_SOLICITUD } from "@/lib/time-metrics";

interface Props {
  areas: Area[];
  currentPeriod: string;
  currentDestinationAreaId?: string;
  currentOriginAreaId?: string;
  currentPriority?: string;
  currentStatus?: string;
  isGeneralAdmin: boolean;
  directorAreaIds: string[];
  reportData: Array<{
    ticketNumber: string;
    title: string;
    type: string;
    priority: string | null;
    statusLabel: string;
    originAreaName: string;
    destinationAreaName: string;
    filedByName: string;
    assigneeName: string;
    filedAtFormatted: string;
    netExecutionFormatted: string;
    totalCycleFormatted: string;
    hasReturn: boolean;
    tasksCount: number;
    completedTasksCount: number;
    filesCount: number;
  }>;
}

export default function ManagementFilters({
  areas,
  currentPeriod,
  currentDestinationAreaId,
  currentOriginAreaId,
  currentPriority,
  currentStatus,
  isGeneralAdmin,
  directorAreaIds,
  reportData,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert("No hay registros en el período y filtros seleccionados para exportar.");
      return;
    }

    const headers = [
      "Folio",
      "Título",
      "Tipo",
      "Prioridad",
      "Área Origen",
      "Área Destino",
      "Radicado Por",
      "Operador Asignado",
      "Fecha Radicación",
      "Estado Actual",
      "Tiempo Neto Ejecución",
      "Tiempo Total Ciclo",
      "Tuvo Devolución",
      "Subtareas Totales",
      "Subtareas Completadas",
      "Enlaces/Evidencias",
    ];

    const escapeCSV = (val: string | number | boolean | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = reportData.map((r) => [
      escapeCSV(r.ticketNumber),
      escapeCSV(r.title),
      escapeCSV(r.type),
      escapeCSV(r.priority || "Sin prioridad"),
      escapeCSV(r.originAreaName),
      escapeCSV(r.destinationAreaName),
      escapeCSV(r.filedByName),
      escapeCSV(r.assigneeName),
      escapeCSV(r.filedAtFormatted),
      escapeCSV(r.statusLabel),
      escapeCSV(r.netExecutionFormatted),
      escapeCSV(r.totalCycleFormatted),
      escapeCSV(r.hasReturn ? "Sí" : "No"),
      escapeCSV(r.tasksCount),
      escapeCSV(r.completedTasksCount),
      escapeCSV(r.filesCount),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `informe_gerencial_monteazul_${dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de áreas de destino disponibles según rol
  const allowedDestinationAreas = isGeneralAdmin
    ? areas
    : areas.filter((a) => directorAreaIds.includes(a.id));

  return (
    <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/70 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
            Filtros Dinámicos y Exportación de Reportes
          </span>
          <span className="text-xs text-slate-600">
            Ajuste el rango temporal y la segmentación funcional para calibrar los indicadores.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Exportar Informe CSV</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
              {reportData.length}
            </span>
          </button>

          {(currentPeriod !== "30d" ||
            currentDestinationAreaId ||
            currentOriginAreaId ||
            currentPriority ||
            currentStatus) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 text-xs font-semibold transition-colors"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Selector de Período Temporal */}
        <div>
          <label className="block font-semibold text-blue-950 mb-1">
            Rango Temporal
          </label>
          <select
            value={currentPeriod || "30d"}
            onChange={(e) => updateParam("period", e.target.value)}
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="this_month">Este mes</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el histórico</option>
          </select>
        </div>

        {/* Selector de Área de Destino */}
        <div>
          <label className="block font-semibold text-blue-950 mb-1">
            Área de Destino
          </label>
          <select
            value={currentDestinationAreaId || "all"}
            onChange={(e) => updateParam("destinationAreaId", e.target.value)}
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isGeneralAdmin && <option value="all">Todas las áreas de destino</option>}
            {allowedDestinationAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Área de Origen */}
        <div>
          <label className="block font-semibold text-blue-950 mb-1">
            Área de Origen
          </label>
          <select
            value={currentOriginAreaId || "all"}
            onChange={(e) => updateParam("originAreaId", e.target.value)}
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las áreas de origen</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Prioridad */}
        <div>
          <label className="block font-semibold text-blue-950 mb-1">
            Prioridad
          </label>
          <select
            value={currentPriority || "all"}
            onChange={(e) => updateParam("priority", e.target.value)}
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        {/* Selector de Estado */}
        <div>
          <label className="block font-semibold text-blue-950 mb-1">
            Estado de Solicitud
          </label>
          <select
            value={currentStatus || "all"}
            onChange={(e) => updateParam("status", e.target.value)}
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(ESTADOS_SOLICITUD).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
