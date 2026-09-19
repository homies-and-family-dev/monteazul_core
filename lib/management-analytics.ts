import { prisma } from "@/lib/prisma";
import { Prisma, RequestStatus } from "@prisma/client";
import { ESTADOS_SOLICITUD, formatDuration } from "@/lib/time-metrics";

export interface ManagementFilterOptions {
  period?: string; // "7d" | "30d" | "this_month" | "90d" | "all"
  destinationAreaId?: string;
  originAreaId?: string;
  priority?: string;
  status?: RequestStatus;
}

export interface StatusBottleneckMetric {
  status: RequestStatus;
  statusLabel: string;
  count: number;
  totalMs: number;
  avgMs: number;
  avgFormatted: string;
  percentageOfCycle: number;
}

export interface AreaPerformanceMetric {
  areaId: string;
  areaName: string;
  areaCode: string;
  receivedCount: number;
  originatedCount: number;
  activeCount: number;
  closedCount: number;
  closureRate: number;
  returnCount: number;
  returnRate: number;
  avgResolutionMs: number;
  avgResolutionFormatted: string;
}

export interface OperatorWorkloadMetric {
  userId: string;
  userName: string;
  userEmail: string;
  areaNames: string[];
  activeRequestsCount: number;
  closedRequestsCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  saturationLevel: "Normal" | "Moderada" | "Alta";
}

export interface ManagementDashboardData {
  filters: {
    period: string;
    destinationAreaId?: string;
    originAreaId?: string;
    priority?: string;
    status?: string;
    startDateText: string;
  };
  summary: {
    totalRequests: number;
    activeRequests: number;
    closedRequests: number;
    closureRate: number;
    returnedRequests: number;
    returnRate: number;
    avgResolutionMs: number;
    avgResolutionFormatted: string;
    avgExecutionMs: number;
    avgExecutionFormatted: string;
    tasksTotal: number;
    tasksCompleted: number;
    tasksPending: number;
    tasksCompletionRate: number;
  };
  bottlenecks: {
    items: StatusBottleneckMetric[];
    criticalStatus: StatusBottleneckMetric | null;
    diagnosisText: string;
  };
  areaPerformance: AreaPerformanceMetric[];
  operatorWorkloads: OperatorWorkloadMetric[];
  recentRequests: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    type: string;
    priority: string | null;
    status: RequestStatus;
    statusLabel: string;
    originAreaName: string;
    destinationAreaName: string;
    filedByName: string;
    assigneeName: string;
    filedAt: Date;
    filedAtFormatted: string;
    netExecutionMs: number;
    netExecutionFormatted: string;
    totalCycleMs: number;
    totalCycleFormatted: string;
    hasReturn: boolean;
    tasksCount: number;
    completedTasksCount: number;
    filesCount: number;
  }>;
}

export function computePeriodStartDate(period?: string): Date | undefined {
  const now = new Date();
  switch (period) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "this_month": {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case "all":
      return undefined;
    case "30d":
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
  }
}

export async function getManagementDashboardData(
  filters: ManagementFilterOptions,
  userScope: {
    isGeneralAdmin: boolean;
    directorAreaIds: string[];
  }
): Promise<ManagementDashboardData> {
  const startDate = computePeriodStartDate(filters.period);

  // Construir condiciones WHERE con Prisma
  // Directores de área restringidos a las áreas que dirigen si no son Administradores Generales
  const allowedDestinationAreaIds =
    !userScope.isGeneralAdmin && userScope.directorAreaIds.length > 0
      ? userScope.directorAreaIds
      : undefined;

  const whereClause: Prisma.RequestWhereInput = {};

  if (startDate) {
    whereClause.filedAt = { gte: startDate };
  }

  if (filters.destinationAreaId && filters.destinationAreaId !== "all") {
    // Si el usuario es director y selecciona un área, validar que esté en sus áreas permitidas
    if (
      !userScope.isGeneralAdmin &&
      !userScope.directorAreaIds.includes(filters.destinationAreaId)
    ) {
      whereClause.destinationAreaId = { in: userScope.directorAreaIds };
    } else {
      whereClause.destinationAreaId = filters.destinationAreaId;
    }
  } else if (allowedDestinationAreaIds) {
    whereClause.destinationAreaId = { in: allowedDestinationAreaIds };
  }

  if (filters.originAreaId && filters.originAreaId !== "all") {
    whereClause.originAreaId = filters.originAreaId;
  }

  if (filters.priority && filters.priority !== "all") {
    whereClause.priority = filters.priority;
  }

  if (filters.status && (filters.status as string) !== "all") {
    whereClause.status = filters.status;
  }

  // Cargar áreas activas para métricas de balance
  const allAreas = await prisma.area.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  // Consultar solicitudes del período con todas las relaciones analíticas
  const requests = await prisma.request.findMany({
    where: whereClause,
    include: {
      originArea: true,
      destinationArea: true,
      filedBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { date: "desc" },
      },
      statusHistory: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { date: "asc" },
      },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
      },
      files: { select: { id: true, name: true, url: true } },
    },
    orderBy: { filedAt: "desc" },
  });

  const nowMs = Date.now();

  // 1. Métricas por estado para Detección de Cuellos de Botella
  const statusAccumulators: Record<
    RequestStatus,
    { count: number; totalMs: number }
  > = {
    FILED: { count: 0, totalMs: 0 },
    ASSIGNED: { count: 0, totalMs: 0 },
    IN_PROGRESS: { count: 0, totalMs: 0 },
    IN_REVIEW: { count: 0, totalMs: 0 },
    RESUBMITTED: { count: 0, totalMs: 0 },
    DELIVERED: { count: 0, totalMs: 0 },
    RETURNED: { count: 0, totalMs: 0 },
    PENDING_CONFIRMATION: { count: 0, totalMs: 0 },
    CLOSED: { count: 0, totalMs: 0 },
  };

  let totalResolutionMsSum = 0;
  let resolvedRequestsCount = 0;
  let totalNetExecutionMsSum = 0;
  let requestsWithExecutionCount = 0;
  let returnedRequestsCount = 0;

  // Operadores: recopilación de cargas
  const operatorMap = new Map<
    string,
    {
      user: { id: string; name: string; email: string };
      areaNames: Set<string>;
      activeRequestsCount: number;
      closedRequestsCount: number;
      activeTasksCount: number;
      completedTasksCount: number;
    }
  >();

  // Procesamiento solicitud a solicitud
  const formattedRequests = requests.map((req) => {
    const history = req.statusHistory;
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let netExecutionMs = 0;
    let hasReturn = false;

    // Medición de tiempos por estado para esta solicitud
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const start = new Date(cur.date).getTime();
      const end = next ? new Date(next.date).getTime() : (req.status === "CLOSED" ? start : nowMs);
      const duration = Math.max(0, end - start);

      if (cur.newStatus in statusAccumulators) {
        statusAccumulators[cur.newStatus].totalMs += duration;
        statusAccumulators[cur.newStatus].count += 1;
      }

      if (cur.newStatus === "IN_PROGRESS" || cur.newStatus === "RETURNED") {
        netExecutionMs += duration;
      }

      if (cur.newStatus === "RETURNED") {
        hasReturn = true;
      }
    }

    if (hasReturn) {
      returnedRequestsCount++;
    }

    // Si no tuvo historial pero está en radicado
    if (sorted.length === 0) {
      const filedTime = new Date(req.filedAt).getTime();
      const duration = Math.max(0, nowMs - filedTime);
      statusAccumulators.FILED.totalMs += duration;
      statusAccumulators.FILED.count += 1;
    }

    // Tiempo total de ciclo
    const filedMs = new Date(req.filedAt).getTime();
    let totalCycleMs = 0;
    if (req.status === "CLOSED") {
      const closedEntry = sorted.find((h) => h.newStatus === "CLOSED");
      const closedMs = closedEntry ? new Date(closedEntry.date).getTime() : nowMs;
      totalCycleMs = Math.max(0, closedMs - filedMs);
      totalResolutionMsSum += totalCycleMs;
      resolvedRequestsCount++;
    } else {
      totalCycleMs = Math.max(0, nowMs - filedMs);
    }

    if (netExecutionMs > 0) {
      totalNetExecutionMsSum += netExecutionMs;
      requestsWithExecutionCount++;
    }

    // Asignación de operador actual
    const currentAssignee = req.assignments[0]?.user;
    if (currentAssignee) {
      if (!operatorMap.has(currentAssignee.id)) {
        operatorMap.set(currentAssignee.id, {
          user: currentAssignee,
          areaNames: new Set([req.destinationArea.name]),
          activeRequestsCount: 0,
          closedRequestsCount: 0,
          activeTasksCount: 0,
          completedTasksCount: 0,
        });
      }
      const op = operatorMap.get(currentAssignee.id)!;
      op.areaNames.add(req.destinationArea.name);
      if (req.status === "CLOSED") {
        op.closedRequestsCount++;
      } else {
        op.activeRequestsCount++;
      }
    }

    // Subtareas de la solicitud
    let completedTasksCount = 0;
    for (const task of req.tasks) {
      if (task.status === "completada") {
        completedTasksCount++;
      }
      if (task.assignedTo) {
        if (!operatorMap.has(task.assignedTo.id)) {
          operatorMap.set(task.assignedTo.id, {
            user: task.assignedTo,
            areaNames: new Set([req.destinationArea.name]),
            activeRequestsCount: 0,
            closedRequestsCount: 0,
            activeTasksCount: 0,
            completedTasksCount: 0,
          });
        }
        const taskOp = operatorMap.get(task.assignedTo.id)!;
        if (task.status === "completada") {
          taskOp.completedTasksCount++;
        } else {
          taskOp.activeTasksCount++;
        }
      }
    }

    return {
      id: req.id,
      ticketNumber: req.ticketNumber,
      title: req.title,
      type: req.type,
      priority: req.priority,
      status: req.status,
      statusLabel: ESTADOS_SOLICITUD[req.status] ?? req.status,
      originAreaName: req.originArea.name,
      destinationAreaName: req.destinationArea.name,
      filedByName: req.filedBy.name,
      assigneeName: currentAssignee ? currentAssignee.name : "Sin asignar",
      filedAt: req.filedAt,
      filedAtFormatted: new Date(req.filedAt).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      netExecutionMs,
      netExecutionFormatted: formatDuration(netExecutionMs),
      totalCycleMs,
      totalCycleFormatted: formatDuration(totalCycleMs),
      hasReturn,
      tasksCount: req.tasks.length,
      completedTasksCount,
      filesCount: req.files.length,
    };
  });

  // 2. Cálculo de Cuellos de Botella y Tiempos Medios
  const activeStatusesForBottleneck: RequestStatus[] = [
    "FILED",
    "ASSIGNED",
    "IN_PROGRESS",
    "IN_REVIEW",
    "RESUBMITTED",
    "DELIVERED",
    "RETURNED",
  ];

  const totalAllStatesMs = activeStatusesForBottleneck.reduce(
    (acc, s) => acc + statusAccumulators[s].totalMs,
    0
  );

  const bottleneckItems: StatusBottleneckMetric[] = activeStatusesForBottleneck.map(
    (st) => {
      const data = statusAccumulators[st];
      const avgMs = data.count > 0 ? Math.round(data.totalMs / data.count) : 0;
      const percentage =
        totalAllStatesMs > 0
          ? Math.round((data.totalMs / totalAllStatesMs) * 100)
          : 0;

      return {
        status: st,
        statusLabel: ESTADOS_SOLICITUD[st] ?? st,
        count: data.count,
        totalMs: data.totalMs,
        avgMs,
        avgFormatted: formatDuration(avgMs),
        percentageOfCycle: percentage,
      };
    }
  ).sort((a, b) => b.avgMs - a.avgMs);

  const criticalStatus = bottleneckItems.find((b) => b.avgMs > 0) || null;

  let diagnosisText = "No se registran suficientes transiciones en el período seleccionado.";
  if (criticalStatus) {
    if (criticalStatus.status === "FILED") {
      diagnosisText = `Cuello de botella detectado en RADICADO. Las solicitudes permanecen un promedio de ${criticalStatus.avgFormatted} esperando asignación de operador por parte de la Dirección de Área.`;
    } else if (criticalStatus.status === "ASSIGNED") {
      diagnosisText = `Cuello de botella detectado en ASIGNADO. Los operadores tardan en promedio ${criticalStatus.avgFormatted} en iniciar la atención formal de las solicitudes asignadas.`;
    } else if (criticalStatus.status === "IN_PROGRESS") {
      diagnosisText = `La fase de EN PROCESO concentra el mayor tiempo de ciclo (${criticalStatus.avgFormatted} en promedio), reflejando la complejidad de las actividades de producción y atención.`;
    } else if (criticalStatus.status === "IN_REVIEW") {
      diagnosisText = `Retrasos concentrados en EN REVISIÓN (${criticalStatus.avgFormatted} en promedio). Los solicitantes tardan en remitir la información o insumos adicionales solicitados por el operador.`;
    } else if (criticalStatus.status === "DELIVERED" || criticalStatus.status === "PENDING_CONFIRMATION") {
      diagnosisText = `Retrasos en confirmación de ENTREGA (${criticalStatus.avgFormatted} en promedio). Las entregas aguardan validación formal de satisfacción por parte del solicitante.`;
    } else if (criticalStatus.status === "RETURNED") {
      diagnosisText = `Atención requerida en DEVOLUCIONES (${criticalStatus.avgFormatted} en promedio). Las correcciones por insatisfacción del resultado demandan ciclos adicionales de ajuste.`;
    } else {
      diagnosisText = `La etapa de mayor duración media es ${criticalStatus.statusLabel} con ${criticalStatus.avgFormatted} de permanencia promedio.`;
    }
  }

  // 3. Balance y Desempeño por Área
  const areaPerformance: AreaPerformanceMetric[] = allAreas.map((area) => {
    const received = requests.filter((r) => r.destinationAreaId === area.id);
    const originated = requests.filter((r) => r.originAreaId === area.id);
    const closed = received.filter((r) => r.status === "CLOSED");
    const active = received.filter((r) => r.status !== "CLOSED");
    const closureRate = received.length > 0 ? Math.round((closed.length / received.length) * 100) : 0;

    let areaReturnCount = 0;
    let areaResolutionMsSum = 0;
    for (const r of received) {
      if (r.statusHistory.some((h) => h.newStatus === "RETURNED")) {
        areaReturnCount++;
      }
      if (r.status === "CLOSED") {
        const closedEntry = r.statusHistory.find((h) => h.newStatus === "CLOSED");
        const closedMs = closedEntry ? new Date(closedEntry.date).getTime() : nowMs;
        areaResolutionMsSum += Math.max(0, closedMs - new Date(r.filedAt).getTime());
      }
    }

    const returnRate = received.length > 0 ? Math.round((areaReturnCount / received.length) * 100) : 0;
    const avgResolutionMs = closed.length > 0 ? Math.round(areaResolutionMsSum / closed.length) : 0;

    return {
      areaId: area.id,
      areaName: area.name,
      areaCode: area.code,
      receivedCount: received.length,
      originatedCount: originated.length,
      activeCount: active.length,
      closedCount: closed.length,
      closureRate,
      returnCount: areaReturnCount,
      returnRate,
      avgResolutionMs,
      avgResolutionFormatted: formatDuration(avgResolutionMs),
    };
  });

  // 4. Cargas de Trabajo de Operadores
  const operatorWorkloads: OperatorWorkloadMetric[] = Array.from(operatorMap.values())
    .map((op) => {
      let saturationLevel: "Normal" | "Moderada" | "Alta" = "Normal";
      if (op.activeRequestsCount >= 5) {
        saturationLevel = "Alta";
      } else if (op.activeRequestsCount >= 3) {
        saturationLevel = "Moderada";
      }

      return {
        userId: op.user.id,
        userName: op.user.name,
        userEmail: op.user.email,
        areaNames: Array.from(op.areaNames),
        activeRequestsCount: op.activeRequestsCount,
        closedRequestsCount: op.closedRequestsCount,
        activeTasksCount: op.activeTasksCount,
        completedTasksCount: op.completedTasksCount,
        saturationLevel,
      };
    })
    .sort((a, b) => b.activeRequestsCount - a.activeRequestsCount);

  // 5. Métricas de Subtareas Consolidadas
  let tasksTotal = 0;
  let tasksCompleted = 0;
  for (const r of requests) {
    for (const t of r.tasks) {
      tasksTotal++;
      if (t.status === "completada") {
        tasksCompleted++;
      }
    }
  }
  const tasksPending = tasksTotal - tasksCompleted;
  const tasksCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  // 6. Resumen General (KPIs)
  const totalRequests = requests.length;
  const closedRequests = requests.filter((r) => r.status === "CLOSED").length;
  const activeRequests = totalRequests - closedRequests;
  const closureRate = totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0;
  const returnRate = totalRequests > 0 ? Math.round((returnedRequestsCount / totalRequests) * 100) : 0;
  const avgResolutionMs = resolvedRequestsCount > 0 ? Math.round(totalResolutionMsSum / resolvedRequestsCount) : 0;
  const avgExecutionMs = requestsWithExecutionCount > 0 ? Math.round(totalNetExecutionMsSum / requestsWithExecutionCount) : 0;

  const startDateText = startDate
    ? startDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Todo el histórico";

  return {
    filters: {
      period: filters.period || "30d",
      destinationAreaId: filters.destinationAreaId,
      originAreaId: filters.originAreaId,
      priority: filters.priority,
      status: filters.status,
      startDateText,
    },
    summary: {
      totalRequests,
      activeRequests,
      closedRequests,
      closureRate,
      returnedRequests: returnedRequestsCount,
      returnRate,
      avgResolutionMs,
      avgResolutionFormatted: formatDuration(avgResolutionMs),
      avgExecutionMs,
      avgExecutionFormatted: formatDuration(avgExecutionMs),
      tasksTotal,
      tasksCompleted,
      tasksPending,
      tasksCompletionRate,
    },
    bottlenecks: {
      items: bottleneckItems,
      criticalStatus,
      diagnosisText,
    },
    areaPerformance,
    operatorWorkloads,
    recentRequests: formattedRequests,
  };
}
