import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  calculateTimeMetrics,
  calculateSubtasksSummary,
  ESTADOS_SOLICITUD,
  StatusHistoryItem,
} from "@/lib/time-metrics";
import WorkflowActions from "./workflow-actions";
import CollapsiblePanels from "./collapsible-panels";
import SubtasksPanel from "./subtasks-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const req = await prisma.request.findUnique({
    where: { id },
    select: { ticketNumber: true, title: true },
  });
  if (!req) return { title: "Solicitud no encontrada" };
  return {
    title: `${req.ticketNumber}: ${req.title} — Monte Azul Suite`,
  };
}

export default async function RequestDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUserId = session.user.id;
  const { id } = await params;

  // Consulta de la solicitud
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      originArea: true,
      destinationArea: true,
      filedBy: true,
      assignments: {
        include: { user: true },
        orderBy: { date: "desc" },
      },
      statusHistory: {
        include: { user: true },
        orderBy: { date: "asc" },
      },
      comments: {
        include: { user: true, files: true },
        orderBy: { date: "asc" },
      },
      files: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        include: { assignedTo: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!request) {
    notFound();
  }

  // Consulta de roles y áreas del usuario autenticado para control de acceso
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { include: { role: true } },
      areas: { include: { area: true } },
    },
  });

  const isGeneralAdmin =
    currentUser?.roles.some((r) => r.role.name === "Administrador General" || r.role.name === "Gerencia") ?? false;

  const userAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];

  const isAreaDirector =
    (currentUser?.roles.some((r) => r.role.name === "Director de Área") &&
      currentUser?.areas.some((a) => a.areaId === request.destinationAreaId)) ??
    false;

  const isDirectorOfRelatedArea =
    (currentUser?.roles.some((r) => r.role.name === "Director de Área") &&
      (userAreaIds.includes(request.destinationAreaId) || userAreaIds.includes(request.originAreaId))) ??
    false;

  const currentAssignee = request.assignments[0]?.user;
  const isAssignedOperator = request.assignments.some((a) => a.userId === currentUserId);
  const isFiler = request.filedById === currentUserId;

  // Validación de acceso al expediente
  const canView = isGeneralAdmin || isDirectorOfRelatedArea || isAssignedOperator || isFiler;

  if (!canView) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">Acceso Restringido a este Expediente</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Este requerimiento pertenece al área de <span className="font-semibold">{request.destinationArea.name}</span> y no se encuentra asignado ni radicado por su usuario.
            Por políticas de segregación funcional y confidencialidad, solo la Dirección del área, Gerencia o los operadores directamente asignados pueden consultar este expediente.
          </p>
          <div>
            <Link
              href="/requests"
              className="inline-block px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              Volver a la Bandeja de Solicitudes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Permisos operativos según la matriz funcional
  const canAssign = isAreaDirector || isGeneralAdmin;
  const canWork = isAssignedOperator || isGeneralAdmin;
  const canValidate = isFiler || isGeneralAdmin;
  const canManageTasks = isAreaDirector || isGeneralAdmin || isAssignedOperator;
  const pendingTasksCount = request.tasks.filter((t) => t.status !== "completada").length;

  // Usuarios disponibles para asignación (únicamente miembros con acceso operativo al área de destino)
  const availableUsers = await prisma.user.findMany({
    where: {
      active: true,
      areas: {
        some: {
          areaId: request.destinationAreaId,
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Cálculo de evaluación de tiempos y responsable por estado
  const metrics = calculateTimeMetrics(
    request.statusHistory as unknown as StatusHistoryItem[],
    request.filedAt,
    request.status,
    {
      destinationAreaName: request.destinationArea.name,
      filerName: request.filedBy.name,
      assigneeName: currentAssignee?.name,
    }
  );

  // Sumatoria y consolidación de tiempos de subtareas
  const subtasksSummary = calculateSubtasksSummary(request.tasks);

  const nombreEstadoActual = ESTADOS_SOLICITUD[request.status] ?? request.status;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Navegación y enlace de retorno */}
        <div className="flex items-center justify-between">
          <Link
            href="/requests"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Volver a la Bandeja de Solicitudes
          </Link>
          <span className="text-xs text-slate-500 font-mono">
            ID: {request.id}
          </span>
        </div>

        {/* Cabecera del expediente con recuadro azul claro */}
        <div className="bg-blue-50/70 p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-900 bg-white px-2.5 py-0.5 rounded border border-blue-300">
                  {request.ticketNumber}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-900 border border-blue-200">
                  {request.type}
                </span>
                {request.priority && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white text-slate-800 border border-blue-200">
                    Prioridad: {request.priority}
                  </span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                  Estado: {nombreEstadoActual}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-blue-950 pt-1">
                {request.title}
              </h1>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs text-slate-600 block">Fecha de radicación</span>
              <span className="text-sm font-semibold text-blue-950">
                {new Date(request.filedAt).toLocaleString("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Cuadrícula de metadatos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-blue-200 text-xs">
            <div>
              <span className="text-slate-600 block font-medium">Área de Origen</span>
              <span className="font-bold text-blue-950">
                {request.originArea.name} ({request.originArea.code})
              </span>
            </div>
            <div>
              <span className="text-slate-600 block font-medium">Área de Destino</span>
              <span className="font-bold text-blue-950">
                {request.destinationArea.name} ({request.destinationArea.code})
              </span>
            </div>
            <div>
              <span className="text-slate-600 block font-medium">Radicado Por</span>
              <span className="font-bold text-blue-950">
                {request.filedBy.name}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block font-medium">Operador Asignado</span>
              <span className="font-bold text-blue-950">
                {currentAssignee ? currentAssignee.name : "Sin asignar"}
              </span>
            </div>
          </div>

          {/* Descripción */}
          <div className="pt-3 border-t border-blue-200">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-950 block mb-1">
              Descripción y Requerimiento Detallado
            </span>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-blue-200">
              {request.description}
            </p>
          </div>

          {/* Acciones de Gestión de Estado (Fijas en el recuadro principal) */}
          <WorkflowActions
            requestId={request.id}
            currentStatus={request.status}
            availableUsers={availableUsers}
            currentAssigneeId={currentAssignee?.id}
            canAssign={canAssign}
            canWork={canWork}
            canValidate={canValidate}
            destinationAreaName={request.destinationArea.name}
            filerName={request.filedBy.name}
            assigneeName={currentAssignee?.name}
            pendingTasksCount={pendingTasksCount}
          />
        </div>

        {/* Paneles y Recuadros Desplegables para no saturar la pantalla */}
        <CollapsiblePanels
          requestId={request.id}
          comments={request.comments}
          transitions={metrics.transitionsWithDuration}
          timesNode={
            <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Control Operativo y Medición de Tiempos
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-slate-700">Estado Actual:</span>
                    <span className="px-3 py-1 bg-blue-700 text-white font-bold text-xs rounded-full shadow-xs">
                      {nombreEstadoActual}
                    </span>
                  </div>
                </div>

                <div className="bg-white px-3.5 py-1.5 rounded-lg border border-blue-200 text-xs">
                  <span className="text-slate-600 font-medium">Tiempo en estado actual: </span>
                  <span className="font-bold text-blue-950">
                    {metrics.currentStatusDurationText}
                  </span>
                </div>
              </div>

              {/* Banner de Responsable Actual */}
              <div className="p-3.5 bg-white rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-600 block font-medium">
                    Responsabilidad operativa en este momento:
                  </span>
                  <span className="text-sm font-bold text-blue-950">
                    {metrics.responsiblePartyText}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-blue-100 font-semibold text-blue-900 border border-blue-200 self-start sm:self-auto">
                  {metrics.responsibleType}
                </span>
              </div>

              {/* Desglose de Métricas de Tiempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block font-medium">Tiempo Neto Solicitud</span>
                  <span className="text-base font-bold text-blue-950 mt-0.5 block">
                    {metrics.executionDurationText || "0 minutos"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tiempo en trabajo efectivo del operador
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block font-medium">Sumatoria de Subtareas</span>
                  <span className="text-base font-bold text-blue-950 mt-0.5 block">
                    {subtasksSummary.totalDurationText}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {request.tasks.length > 0
                      ? `Suma de ${request.tasks.length} subtarea(s) del servicio`
                      : "Sin subtareas registradas"}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block font-medium">Tiempo en Espera Solicitante</span>
                  <span className="text-base font-bold text-blue-950 mt-0.5 block">
                    {metrics.waitingFilerDurationText || "0 minutos"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Revisiones o validación de entrega por el solicitante
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block font-medium">Tiempo Total Transcurrido</span>
                  <span className="text-base font-bold text-blue-950 mt-0.5 block">
                    {metrics.totalDurationText}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tiempo transcurrido desde la radicación
                  </span>
                </div>
              </div>
            </div>
          }
          tasksNode={
            <SubtasksPanel
              requestId={request.id}
              requestStatus={request.status}
              tasks={request.tasks}
              availableUsers={availableUsers}
              canManageTasks={canManageTasks}
              currentUserId={currentUserId}
            />
          }
          linksNode={
            <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-3">
              <div>
                <h3 className="text-sm font-bold text-blue-950">
                  Repositorios y Enlaces Externos
                </h3>
                <p className="text-xs text-slate-600">
                  Direcciones web de repositorios, carpetas en la nube o insumos registrados para esta solicitud.
                </p>
              </div>

              {request.files.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-blue-100">
                  No se han registrado enlaces externos o repositorios en este requerimiento.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {request.files.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-lg border border-blue-200 bg-white flex items-center justify-between"
                    >
                      <div className="truncate mr-3">
                        <span className="text-xs font-bold text-blue-950 block truncate">
                          {file.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">
                          {file.url}
                        </span>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold whitespace-nowrap shadow-xs"
                      >
                        Abrir enlace
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
          tasksCount={request.tasks.length}
          completedTasksCount={subtasksSummary.completedTasks}
          linksCount={request.files.length}
        />
      </div>
    </div>
  );
}
