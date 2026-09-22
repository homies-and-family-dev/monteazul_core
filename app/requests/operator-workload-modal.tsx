"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getOperatorWorkload } from "./actions";
import { ESTADOS_SOLICITUD } from "@/lib/time-metrics";

interface OperatorWorkloadModalProps {
  operatorId: string;
  operatorName: string;
}

type WorkloadData = {
  requests: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string | null;
    type: string;
    filedAt: Date;
    destinationArea: { code: string; name: string };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    request: {
      id: string;
      ticketNumber: string;
      title: string;
    };
  }>;
  goalTasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    goal: {
      id: string;
      title: string;
      area: { code: string; name: string };
    };
  }>;
};

const ESTILOS_ESTADO: Record<string, { bg: string; text: string; border: string }> = {
  FILED: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" },
  ASSIGNED: { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-300" },
  IN_PROGRESS: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300" },
  IN_REVIEW: { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300" },
  RESUBMITTED: { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-300" },
  DELIVERED: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300" },
  RETURNED: { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300" },
  PENDING_CONFIRMATION: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" },
  CLOSED: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-300" },
};

const ESTILOS_PRIORIDAD: Record<string, string> = {
  Baja: "bg-slate-100 text-slate-700 border-slate-300",
  Media: "bg-blue-100 text-blue-900 border-blue-300",
  Alta: "bg-amber-100 text-amber-900 border-amber-300",
  Urgente: "bg-rose-100 text-rose-900 border-rose-300 font-semibold",
};

export default function OperatorWorkloadModal({
  operatorId,
  operatorName,
}: OperatorWorkloadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "tasks">("requests");
  const [data, setData] = useState<WorkloadData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    if (!data) {
      startTransition(async () => {
        try {
          setError(null);
          const res = await getOperatorWorkload(operatorId);
          setData(res as unknown as WorkloadData);
        } catch {
          setError("No fue posible cargar las actividades asignadas.");
        }
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const requestsCount = data?.requests?.length ?? 0;
  const tasksCount = (data?.tasks?.length ?? 0) + (data?.goalTasks?.length ?? 0);

  return (
    <>
      {/* Botón pequeño en celda de la tabla */}
      <button
        type="button"
        onClick={handleOpen}
        title={`Ver solicitudes y tareas asignadas a ${operatorName}`}
        aria-label={`Ver actividades asignadas a ${operatorName}`}
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 hover:border-blue-300 transition-colors shadow-2xs shrink-0 cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </button>

      {/* Modal flotante */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-blue-700">Asignaciones:</span> {operatorName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista de requerimientos y tareas operativas asignadas en el sistema
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Pestañas */}
            <div className="px-6 pt-3 border-b border-slate-200 bg-white flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "requests"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Solicitudes
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {requestsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "tasks"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Tareas y Avances
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "tasks"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tasksCount}
                </span>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {isPending && (
                <div className="py-12 text-center space-y-2">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Cargando actividades...</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}

              {!isPending && !error && activeTab === "requests" && (
                <>
                  {requestsCount === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200 p-6">
                      No registra solicitudes asignadas actualmente.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data?.requests.map((r) => {
                        const estilo = ESTILOS_ESTADO[r.status] ?? ESTILOS_ESTADO.FILED;
                        const nombreEstado = (ESTADOS_SOLICITUD as Record<string, string>)[r.status] ?? r.status;

                        return (
                          <div
                            key={r.id}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {r.ticketNumber}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {r.destinationArea?.name ?? r.type}
                                </span>
                              </div>
                              <Link
                                href={`/requests/${r.id}`}
                                className="font-semibold text-slate-900 text-sm hover:text-blue-700 block truncate"
                              >
                                {r.title}
                              </Link>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {r.priority && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] border ${
                                    ESTILOS_PRIORIDAD[r.priority] ??
                                    "bg-slate-100 text-slate-700 border-slate-300"
                                  }`}
                                >
                                  {r.priority}
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estilo.bg} ${estilo.text} ${estilo.border}`}
                              >
                                {nombreEstado}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {!isPending && !error && activeTab === "tasks" && (
                <>
                  {tasksCount === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200 p-6">
                      No registra tareas operativas ni avances asignados actualmente.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Tareas de Solicitudes */}
                      {data?.tasks.map((t) => {
                        const statusColors: Record<string, string> = {
                          pendiente: "bg-amber-50 text-amber-800 border-amber-200",
                          en_proceso: "bg-blue-50 text-blue-800 border-blue-200",
                          completada: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        };
                        const statusLabel: Record<string, string> = {
                          pendiente: "Pendiente",
                          en_proceso: "En Proceso",
                          completada: "Completada",
                        };

                        return (
                          <div
                            key={t.id}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="font-semibold text-slate-900 text-xs block truncate">
                                {t.title}
                              </span>
                              <Link
                                href={`/requests/${t.request.id}`}
                                className="text-[11px] text-blue-700 hover:underline block truncate"
                              >
                                Requerimiento: {t.request.ticketNumber} — {t.request.title}
                              </Link>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${
                                statusColors[t.status] ?? "bg-slate-100 text-slate-700 border-slate-300"
                              }`}
                            >
                              {statusLabel[t.status] ?? t.status}
                            </span>
                          </div>
                        );
                      })}

                      {/* Avances / Tareas de Metas */}
                      {data?.goalTasks.map((gt) => {
                        const statusColors: Record<string, string> = {
                          pendiente: "bg-amber-50 text-amber-800 border-amber-200",
                          en_proceso: "bg-blue-50 text-blue-800 border-blue-200",
                          completada: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        };
                        const statusLabel: Record<string, string> = {
                          pendiente: "Pendiente",
                          en_proceso: "En Proceso",
                          completada: "Cumplido",
                        };

                        return (
                          <div
                            key={gt.id}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="font-semibold text-slate-900 text-xs block truncate">
                                {gt.title}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                Objetivo de Área: {gt.goal.title} ({gt.goal.area.code})
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${
                                statusColors[gt.status] ?? "bg-slate-100 text-slate-700 border-slate-300"
                              }`}
                            >
                              {statusLabel[gt.status] ?? gt.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {requestsCount} solicitudes • {tasksCount} tareas/avances
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
