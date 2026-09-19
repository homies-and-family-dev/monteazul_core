"use client";

import { useState } from "react";
import { RequestStatus } from "@prisma/client";
import { createTask, updateTaskStatus, deleteTask } from "../actions";
import {
  calculateTaskDurationMs,
  calculateSubtasksSummary,
  formatDuration,
} from "@/lib/time-metrics";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt: Date | null;
  durationMs?: number;
}

interface Props {
  requestId: string;
  requestStatus: RequestStatus;
  tasks: TaskItem[];
  availableUsers: Array<{ id: string; name: string; email: string }>;
  canManageTasks: boolean;
  currentUserId: string;
}

const ESTADOS_TAREA: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
  },
  en_proceso: {
    label: "En Proceso",
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
  },
  completada: {
    label: "Completada",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
  },
};

export default function SubtasksPanel({
  requestId,
  requestStatus,
  tasks,
  availableUsers,
  canManageTasks,
  currentUserId,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isRequestFinished =
    requestStatus === "CLOSED" ||
    requestStatus === "DELIVERED" ||
    requestStatus === "PENDING_CONFIRMATION";

  const isRequestInProgress = requestStatus === "IN_PROGRESS";

  const subtasksSummary = calculateSubtasksSummary(tasks);
  const total = tasks.length;
  const completed = subtasksSummary.completedTasks;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmitting(true);
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("title", taskTitle);
    if (assignedToId) fd.set("assignedToId", assignedToId);

    try {
      await createTask(fd);
      setTaskTitle("");
      setAssignedToId("");
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    if (isRequestFinished) return;
    if (newStatus === "en_proceso" && !isRequestInProgress) {
      setNoticeMessage(
        "No es posible iniciar la tarea: debe iniciar la atención de la solicitud general antes de comenzar a ejecutar sus subtareas."
      );
      return;
    }
    setNoticeMessage(null);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("requestId", requestId);
    fd.set("newStatus", newStatus);
    try {
      await updateTaskStatus(fd);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar el estado de la tarea.";
      setNoticeMessage(msg);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (isRequestFinished) return;
    if (!confirm("¿Desea eliminar esta subtarea?")) return;
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("requestId", requestId);
    await deleteTask(fd);
  };

  return (
    <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-blue-950">
            Subtareas Derivadas del Requerimiento
          </h3>
          <p className="text-xs text-slate-600">
            Desglose operativo para coordinar las actividades necesarias para la entrega.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isRequestFinished && (
            <span className="text-[11px] font-semibold text-slate-700 bg-white border border-blue-200 px-2.5 py-1 rounded">
              Solicitud finalizada (Subtareas consolidadas en solo lectura)
            </span>
          )}

          {canManageTasks && !isRequestFinished && !showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Agregar Subtarea
            </button>
          )}
        </div>
      </div>

      {/* Alerta de restricción si la solicitud está en estado Asignado pero no iniciada */}
      {requestStatus === "ASSIGNED" && tasks.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            <strong>Atención requerida:</strong> La solicitud general se encuentra asignada pero no ha iniciado atención. Debe iniciar la atención de la solicitud general utilizando el botón <strong>&quot;Iniciar Atención (Pasar a En Proceso)&quot;</strong> en la parte superior antes de comenzar a ejecutar sus subtareas.
          </span>
          <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded border border-amber-300 whitespace-nowrap self-start sm:self-auto">
            Pendiente de Iniciar Atención
          </span>
        </div>
      )}

      {/* Mensaje de notificación de regla de negocio */}
      {noticeMessage && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-950 flex items-center justify-between gap-2 shadow-2xs">
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-xs px-2 py-0.5 rounded hover:bg-rose-100 transition-colors"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Resumen de Tiempos y Progreso de Subtareas */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-blue-200">
          <div className="space-y-1">
            <span className="text-xs text-slate-600 block font-medium">
              Sumatoria de Tiempo en Subtareas
            </span>
            <span className="text-xl font-bold text-blue-950 block">
              {subtasksSummary.totalDurationText}
            </span>
            <span className="text-[11px] text-slate-500">
              Tiempo acumulado dedicado a las {total} actividades requeridas para cumplir el servicio
            </span>
          </div>

          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Progreso operativo:</span>
              <span className="font-bold text-blue-950">
                {completed} de {total} completadas ({percent}%)
              </span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            {subtasksSummary.inProgressMs > 0 && (
              <span className="text-[11px] text-amber-800 font-medium">
                En ejecución activa en este momento: {subtasksSummary.inProgressDurationText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Formulario para agregar subtarea */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border border-blue-300 space-y-3">
          <span className="text-xs font-bold text-blue-950 block">
            Nueva Subtarea
          </span>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Descripción de la actividad (Obligatorio)
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Ejemplo: Diseño de piezas gráficas para redes"
              required
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Operador Responsable (Opcional)
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin asignar específicamente --</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setTaskTitle("");
                setAssignedToId("");
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !taskTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar Subtarea"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de tareas */}
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500 italic bg-white p-4 rounded-lg border border-blue-100 text-center">
          Esta solicitud no tiene subtareas desglosadas por el momento.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const estilo = ESTADOS_TAREA[task.status] ?? ESTADOS_TAREA.pendiente;
            const isAssignedToMe = task.assignedToId === currentUserId;
            const canEditStatus = !isRequestFinished && (canManageTasks || isAssignedToMe);
            const taskDurationMs = calculateTaskDurationMs(task);
            const taskDurationText = formatDuration(taskDurationMs);

            return (
              <div
                key={task.id}
                className="p-3 bg-white rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${estilo.bg} ${estilo.text} ${estilo.border}`}
                    >
                      {estilo.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    {task.assignedTo ? (
                      <span>
                        Responsable: <strong className="text-slate-800">{task.assignedTo.name}</strong>
                      </span>
                    ) : (
                      <span className="italic text-slate-400">Sin operador asignado</span>
                    )}

                    {task.status === "completada" && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 border border-emerald-200 font-semibold">
                        Tiempo dedicado: {taskDurationText}
                        {task.completedAt && (
                          <span className="text-slate-600 ml-1 font-normal">
                            (Finalizada el {new Date(task.completedAt).toLocaleDateString("es-ES")})
                          </span>
                        )}
                      </span>
                    )}

                    {task.status === "en_proceso" && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-950 border border-amber-200 font-semibold">
                        Tiempo en curso: {taskDurationText}
                      </span>
                    )}

                    {task.status === "pendiente" && (
                      <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                        {taskDurationMs > 0 ? (
                          <span>Tiempo acumulado previo: <strong>{taskDurationText}</strong> (Pausada)</span>
                        ) : (
                          <span>Sin iniciar (0 minutos)</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones de la tarea */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {canEditStatus && (
                    <>
                      {task.status === "pendiente" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isRequestInProgress) {
                              setNoticeMessage(
                                "No es posible iniciar la tarea: debe iniciar la atención de la solicitud general antes de comenzar a ejecutar sus subtareas."
                              );
                              return;
                            }
                            handleStatusUpdate(task.id, "en_proceso");
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                            isRequestInProgress
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          }`}
                          title={
                            isRequestInProgress
                              ? "Iniciar esta subtarea"
                              : "Debe iniciar la atención de la solicitud general antes de comenzar a ejecutar sus subtareas"
                          }
                        >
                          Iniciar
                        </button>
                      )}

                      {task.status === "en_proceso" && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(task.id, "completada")}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded transition-colors"
                        >
                          Marcar Completada
                        </button>
                      )}

                      {task.status === "completada" && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(task.id, "en_proceso")}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded transition-colors"
                        >
                          Reabrir
                        </button>
                      )}
                    </>
                  )}

                  {!isRequestFinished && canManageTasks && (
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      className="px-2 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded transition-colors ml-1"
                      title="Eliminar subtarea"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
