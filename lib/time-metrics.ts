import { RequestStatus } from "@prisma/client";

export const ESTADOS_SOLICITUD: Record<RequestStatus, string> = {
  FILED: "Radicado",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En Proceso",
  IN_REVIEW: "En Revisión",
  RESUBMITTED: "Reenviada",
  DELIVERED: "Entregado",
  RETURNED: "Devuelto",
  PENDING_CONFIRMATION: "Por Confirmar",
  CLOSED: "Cerrado",
};

export type TipoResponsable =
  | "Dirección de Área"
  | "Operador Asignado"
  | "Solicitante"
  | "Proceso Culminado";

export interface StatusHistoryItem {
  id: string;
  previousStatus: RequestStatus | null;
  newStatus: RequestStatus;
  date: Date;
  note: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TimeMetricSummary {
  currentStatusDurationText: string;
  totalDurationText: string;
  executionDurationText: string; // Tiempo en En Proceso o corrección
  waitingFilerDurationText: string; // Tiempo en En Revisión o Entregado
  waitingOperatorResumeDurationText: string; // Tiempo en Reenviada
  responsiblePartyText: string;
  responsibleType: TipoResponsable;
  transitionsWithDuration: Array<
    StatusHistoryItem & {
      previousStatusLabel: string | null;
      newStatusLabel: string;
      durationInStateText?: string;
      responsibleLabel: string;
    }
  >;
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} días`);
  if (hours > 0) parts.push(`${hours} horas`);
  parts.push(`${minutes} minutos`);

  return parts.join(" ");
}

export function getResponsibleForStatus(
  status: RequestStatus,
  context: {
    destinationAreaName: string;
    filerName: string;
    assigneeName?: string;
  }
): { label: string; type: TipoResponsable } {
  switch (status) {
    case "FILED":
      return {
        label: `Dirección de ${context.destinationAreaName} (Pendiente de Asignación)`,
        type: "Dirección de Área",
      };
    case "ASSIGNED":
    case "IN_PROGRESS":
      return {
        label: context.assigneeName
          ? `Operador: ${context.assigneeName} (En ejecución)`
          : `Operador asignado de ${context.destinationAreaName}`,
        type: "Operador Asignado",
      };
    case "IN_REVIEW":
      return {
        label: `Solicitante: ${context.filerName} (Pendiente de responder información solicitada)`,
        type: "Solicitante",
      };
    case "RESUBMITTED":
      return {
        label: context.assigneeName
          ? `Operador: ${context.assigneeName} (Información recibida, pendiente de reanudar)`
          : `Operador asignado de ${context.destinationAreaName}`,
        type: "Operador Asignado",
      };
    case "DELIVERED":
    case "PENDING_CONFIRMATION":
      return {
        label: `Solicitante: ${context.filerName} (Pendiente de validar entrega)`,
        type: "Solicitante",
      };
    case "RETURNED":
      return {
        label: context.assigneeName
          ? `Operador: ${context.assigneeName} (Devuelto para corrección)`
          : `Operador asignado de ${context.destinationAreaName}`,
        type: "Operador Asignado",
      };
    case "CLOSED":
      return {
        label: "Proceso culminado y cerrado formalmente",
        type: "Proceso Culminado",
      };
    default:
      return { label: "No determinado", type: "Dirección de Área" };
  }
}

export function calculateTimeMetrics(
  history: StatusHistoryItem[],
  filedAt: Date,
  currentStatus: RequestStatus,
  context: {
    destinationAreaName: string;
    filerName: string;
    assigneeName?: string;
  }
): TimeMetricSummary {
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const now = new Date().getTime();
  let executionMs = 0;
  let waitingFilerMs = 0;
  let waitingOperatorResumeMs = 0;

  const transitionsWithDuration: Array<
    StatusHistoryItem & {
      previousStatusLabel: string | null;
      newStatusLabel: string;
      durationInStateText?: string;
      responsibleLabel: string;
    }
  > = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const startTime = new Date(current.date).getTime();
    const endTime = next ? new Date(next.date).getTime() : now;
    const durationMs = endTime - startTime;

    const responsible = getResponsibleForStatus(current.newStatus, context);

    if (current.newStatus === "IN_PROGRESS" || current.newStatus === "RETURNED") {
      executionMs += durationMs;
    } else if (
      current.newStatus === "IN_REVIEW" ||
      current.newStatus === "DELIVERED" ||
      current.newStatus === "PENDING_CONFIRMATION"
    ) {
      waitingFilerMs += durationMs;
    } else if (current.newStatus === "RESUBMITTED") {
      waitingOperatorResumeMs += durationMs;
    }

    transitionsWithDuration.push({
      ...current,
      previousStatusLabel: current.previousStatus
        ? ESTADOS_SOLICITUD[current.previousStatus] ?? current.previousStatus
        : null,
      newStatusLabel: ESTADOS_SOLICITUD[current.newStatus] ?? current.newStatus,
      durationInStateText: formatDuration(durationMs),
      responsibleLabel: responsible.label,
    });
  }

  const lastEntry = sorted[sorted.length - 1];
  const lastStateStart = lastEntry ? new Date(lastEntry.date).getTime() : new Date(filedAt).getTime();
  const currentDurationMs = now - lastStateStart;
  const totalMs = now - new Date(filedAt).getTime();

  const currentResponsible = getResponsibleForStatus(currentStatus, context);

  return {
    currentStatusDurationText: formatDuration(currentDurationMs),
    totalDurationText: formatDuration(totalMs),
    executionDurationText: formatDuration(executionMs),
    waitingFilerDurationText: formatDuration(waitingFilerMs),
    waitingOperatorResumeDurationText: formatDuration(waitingOperatorResumeMs),
    responsiblePartyText: currentResponsible.label,
    responsibleType: currentResponsible.type,
    transitionsWithDuration: transitionsWithDuration.reverse(),
  };
}

export interface TaskTimeItem {
  id: string;
  status: string;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  durationMs?: number | null;
}

export function calculateTaskDurationMs(task: TaskTimeItem, nowMs: number = Date.now()): number {
  const accumulated = task.durationMs || 0;

  if (task.status === "completada") {
    if (accumulated > 0) return accumulated;
    if (task.completedAt) {
      const start = task.startedAt
        ? new Date(task.startedAt).getTime()
        : new Date(task.createdAt).getTime();
      return Math.max(0, new Date(task.completedAt).getTime() - start);
    }
    return 0;
  }

  if (task.status === "en_proceso") {
    const start = task.startedAt
      ? new Date(task.startedAt).getTime()
      : new Date(task.createdAt).getTime();
    const currentCycle = Math.max(0, nowMs - start);
    return accumulated + currentCycle;
  }

  // En estado pendiente o pausada
  return accumulated;
}

export function calculateSubtasksSummary(tasks: TaskTimeItem[]): {
  totalMs: number;
  totalDurationText: string;
  completedMs: number;
  completedDurationText: string;
  inProgressMs: number;
  inProgressDurationText: string;
  totalTasks: number;
  completedTasks: number;
} {
  const now = Date.now();
  let totalMs = 0;
  let completedMs = 0;
  let inProgressMs = 0;
  let completedTasks = 0;

  for (const t of tasks) {
    const d = calculateTaskDurationMs(t, now);
    totalMs += d;
    if (t.status === "completada") {
      completedMs += d;
      completedTasks++;
    } else if (t.status === "en_proceso") {
      inProgressMs += d;
    }
  }

  return {
    totalMs,
    totalDurationText: formatDuration(totalMs),
    completedMs,
    completedDurationText: formatDuration(completedMs),
    inProgressMs,
    inProgressDurationText: formatDuration(inProgressMs),
    totalTasks: tasks.length,
    completedTasks,
  };
}
