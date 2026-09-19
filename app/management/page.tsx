import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getManagementDashboardData,
  ManagementFilterOptions,
} from "@/lib/management-analytics";
import ManagementFilters from "./management-filters";
import { RequestStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    destinationAreaId?: string;
    originAreaId?: string;
    priority?: string;
    status?: string;
  }>;
}

export default async function ManagementDashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUserId = session.user.id;

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      areas: { include: { area: true } },
    },
  });

  const rolesList = currentUser?.roles.map((r) => r.role.name) ?? [];
  const permissionsList = Array.from(
    new Set(
      currentUser?.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      ) ?? []
    )
  );

  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const canAccessManagement =
    isGeneralAdmin || permissionsList.includes("management:view");

  const directorAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];

  // Verificación de acceso al Módulo Gerencial (Puntos 4, 26, 27 y 28)
  if (!canAccessManagement) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo Gerencial
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El Módulo Gerencial Transversal y sus cuadros de mando de analítica corporativa están reservados exclusivamente para usuarios con el permiso de analítica gerencial habilitado o la Administración General.
          </p>
          <div>
            <Link
              href="/requests"
              className="inline-block px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              Ir a la Bandeja de Solicitudes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const filters: ManagementFilterOptions = {
    period: sp.period || "30d",
    destinationAreaId: sp.destinationAreaId,
    originAreaId: sp.originAreaId,
    priority: sp.priority,
    status: sp.status as RequestStatus | undefined,
  };

  // Cargar áreas del sistema
  const areas = await prisma.area.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  // Ejecutar analítica gerencial
  const dashboard = await getManagementDashboardData(filters, {
    isGeneralAdmin,
    directorAreaIds,
  });

  const roleTitle = isGeneralAdmin
    ? "Vista Corporativa Global (Todas las Áreas)"
    : `Vista Gerencial de Área (${currentUser?.areas.map((a) => a.area.name).join(", ") || "Área Asignada"})`;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo Gerencial */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                Módulo Gerencial Transversal
              </span>
              <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                {roleTitle}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Tablero de Indicadores y Analítica Operativa
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Supervisión de tiempos de ciclo, cuellos de botella, balance de cargas y calidad de entregas.
            </p>
          </div>

          <div className="text-left md:text-right text-xs">
            <span className="text-slate-600 block">Corte de datos:</span>
            <span className="font-semibold text-blue-950 font-mono">
              Desde {dashboard.filters.startDateText} hasta hoy
            </span>
          </div>
        </div>

        {/* Barra de Filtros Dinámicos y Exportador CSV */}
        <ManagementFilters
          areas={areas}
          currentPeriod={dashboard.filters.period}
          currentDestinationAreaId={dashboard.filters.destinationAreaId}
          currentOriginAreaId={dashboard.filters.originAreaId}
          currentPriority={dashboard.filters.priority}
          currentStatus={dashboard.filters.status}
          isGeneralAdmin={isGeneralAdmin}
          directorAreaIds={directorAreaIds}
          reportData={dashboard.recentRequests}
        />

        {/* 1. Tarjetas de Resumen Ejecutivo (KPIs Clave) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Total Solicitudes */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Total Radicadas
            </span>
            <span className="text-2xl font-bold text-blue-950 block">
              {dashboard.summary.totalRequests}
            </span>
            <span className="text-[11px] text-slate-600 block">
              {dashboard.summary.activeRequests} activas | {dashboard.summary.closedRequests} cerradas
            </span>
          </div>

          {/* Tasa de Cierre / Efectividad */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Tasa de Cierre
            </span>
            <span className="text-2xl font-bold text-blue-950 block">
              {dashboard.summary.closureRate}%
            </span>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-blue-700 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, dashboard.summary.closureRate)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-600 block pt-0.5">
              Solicitudes culminadas
            </span>
          </div>

          {/* Tiempo Promedio de Ciclo */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Ciclo Promedio Total
            </span>
            <span className="text-base font-bold text-blue-950 block truncate">
              {dashboard.summary.avgResolutionFormatted || "0 minutos"}
            </span>
            <span className="text-[11px] text-slate-600 block">
              De radicación a cierre formal
            </span>
          </div>

          {/* Tiempo Neto de Ejecución */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Tiempo Neto de Trabajo
            </span>
            <span className="text-base font-bold text-blue-950 block truncate">
              {dashboard.summary.avgExecutionFormatted || "0 minutos"}
            </span>
            <span className="text-[11px] text-slate-600 block">
              Promedio en estado En Proceso
            </span>
          </div>

          {/* Tasa de Devoluciones */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Tasa de Devolución
            </span>
            <span className="text-2xl font-bold text-blue-950 block">
              {dashboard.summary.returnRate}%
            </span>
            <span className="text-[11px] text-slate-600 block">
              {dashboard.summary.returnedRequests} con ciclo de ajuste
            </span>
          </div>

          {/* Cumplimiento de Subtareas */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block">
              Avance de Subtareas
            </span>
            <span className="text-2xl font-bold text-blue-950 block">
              {dashboard.summary.tasksCompletionRate}%
            </span>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-blue-700 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, dashboard.summary.tasksCompletionRate)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-600 block pt-0.5">
              {dashboard.summary.tasksCompleted} de {dashboard.summary.tasksTotal} finalizadas
            </span>
          </div>
        </div>

        {/* 2. Diagnóstico de Cuellos de Botella y Tiempos por Estado */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                Análisis de Cuellos de Botella y Tiempos en Cola
              </span>
              <p className="text-xs text-slate-600">
                Permanencia media acumulada por cada estado del flujo operativo corporativo.
              </p>
            </div>
            {dashboard.bottlenecks.criticalStatus && (
              <span className="text-xs px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-bold border border-blue-300 self-start sm:self-auto">
                Mayor concentración: {dashboard.bottlenecks.criticalStatus.statusLabel}
              </span>
            )}
          </div>

          {/* Tarjeta de Recomendación y Diagnóstico Gerencial */}
          <div className="p-3.5 bg-white rounded-lg border border-blue-200 text-xs">
            <span className="font-bold text-blue-950 block mb-0.5">
              Diagnóstico Operativo del Período:
            </span>
            <p className="text-slate-700 leading-relaxed">
              {dashboard.bottlenecks.diagnosisText}
            </p>
          </div>

          {/* Barras de Tiempos por Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {dashboard.bottlenecks.items.map((item) => {
              const isCritical =
                dashboard.bottlenecks.criticalStatus?.status === item.status && item.avgMs > 0;

              return (
                <div
                  key={item.status}
                  className={`p-3 rounded-lg border transition-colors ${
                    isCritical
                      ? "bg-white border-blue-400 shadow-xs ring-1 ring-blue-300"
                      : "bg-white border-blue-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-950 truncate">
                      {item.statusLabel}
                    </span>
                    {isCritical && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-700 text-white">
                        Cuello crítico
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-bold text-blue-900 block font-mono">
                    {item.avgFormatted || "0 minutos"}
                  </span>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        isCritical ? "bg-blue-700" : "bg-blue-400"
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, item.percentageOfCycle))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.count} paso(s)</span>
                    <span>{item.percentageOfCycle}% del ciclo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Balance Operativo por Áreas */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="border-b border-blue-200/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              Balance y Rendimiento por Área Funcional
            </span>
            <p className="text-xs text-slate-600">
              Comparativa de volumen de solicitudes recibidas como área de destino y originadas como solicitante.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboard.areaPerformance.map((area) => (
              <div
                key={area.areaId}
                className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">{area.areaName}</h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Código: {area.areaCode}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    {area.closureRate}% efectividad
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">Recibidas</span>
                    <span className="text-base font-bold text-blue-950">
                      {area.receivedCount}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">Originadas</span>
                    <span className="text-base font-bold text-blue-950">
                      {area.originatedCount}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">Activas en curso</span>
                    <span className="text-sm font-bold text-blue-900">
                      {area.activeCount}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">Cerradas</span>
                    <span className="text-sm font-bold text-blue-900">
                      {area.closedCount}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Tasa Devoluciones: <strong className="text-blue-950">{area.returnRate}%</strong> ({area.returnCount})</span>
                  <span>Tiempo Medio: <strong className="text-blue-950">{area.avgResolutionFormatted || "0m"}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Distribución de Carga de Trabajo de Operadores */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="border-b border-blue-200/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              Distribución de Cargas de Trabajo de Operadores
            </span>
            <p className="text-xs text-slate-600">
              Monitoreo de solicitudes y subtareas activas asignadas a cada responsable del equipo.
            </p>
          </div>

          {dashboard.operatorWorkloads.length === 0 ? (
            <div className="p-4 bg-white rounded-lg border border-blue-200 text-center text-xs text-slate-600">
              No hay operadores con solicitudes o subtareas asignadas en el período consultado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dashboard.operatorWorkloads.map((op) => (
                <div
                  key={op.userId}
                  className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">{op.userName}</h4>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                        {op.userEmail}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        op.saturationLevel === "Alta"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : op.saturationLevel === "Moderada"
                          ? "bg-amber-50 text-amber-900 border-amber-200"
                          : "bg-blue-100 text-blue-900 border-blue-200"
                      }`}
                    >
                      Carga {op.saturationLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Solicitudes Activas</span>
                      <span className="text-sm font-bold text-blue-950">
                        {op.activeRequestsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Solicitudes Cerradas</span>
                      <span className="text-sm font-bold text-blue-950">
                        {op.closedRequestsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Subtareas Activas</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {op.activeTasksCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Subtareas Listas</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {op.completedTasksCount}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 truncate">
                    Área: {op.areaNames.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Registro y Reporte Detallado de Solicitudes */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                Expedientes del Período ({dashboard.recentRequests.length} solicitudes)
              </span>
              <p className="text-xs text-slate-600">
                Auditoría detallada con métricas de tiempo neto, tiempos totales y estado de subtareas.
              </p>
            </div>
          </div>

          {dashboard.recentRequests.length === 0 ? (
            <div className="p-8 bg-white rounded-lg border border-blue-200 text-center text-xs text-slate-600">
              No se encontraron solicitudes con los criterios de búsqueda y filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-blue-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100/70 text-blue-950 font-bold border-b border-blue-200">
                    <th className="p-3">Folio</th>
                    <th className="p-3">Título / Tipo</th>
                    <th className="p-3">Flujo Áreas</th>
                    <th className="p-3">Operador</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">T. Neto Trabajo</th>
                    <th className="p-3">T. Ciclo Total</th>
                    <th className="p-3 text-center">Subtareas</th>
                    <th className="p-3 text-center">Devolución</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-slate-800">
                  {dashboard.recentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-950 whitespace-nowrap">
                        {req.ticketNumber}
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="font-semibold text-blue-950 block truncate">
                          {req.title}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {req.type} {req.priority ? `| Prioridad: ${req.priority}` : ""}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] whitespace-nowrap">
                        <span className="text-slate-600 block">{req.originAreaName}</span>
                        <span className="text-blue-950 font-semibold block">
                          → {req.destinationAreaName}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">
                          {req.assigneeName}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Radicó: {req.filedByName}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          {req.statusLabel}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-blue-950 whitespace-nowrap">
                        {req.netExecutionFormatted || "0m"}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {req.totalCycleFormatted || "0m"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="text-[11px] font-mono font-semibold text-slate-700">
                          {req.completedTasksCount}/{req.tasksCount}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {req.hasReturn ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Sí
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">No</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Link
                          href={`/requests/${req.id}`}
                          className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] shadow-2xs transition-colors"
                        >
                          Ver Expediente
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
