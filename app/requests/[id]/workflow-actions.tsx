"use client";

import { useState } from "react";
import { RequestStatus } from "@prisma/client";
import { updateRequestStatus } from "../actions";

interface Props {
  requestId: string;
  currentStatus: RequestStatus;
  availableUsers: Array<{ id: string; name: string; email: string }>;
  currentAssigneeId?: string;
  canAssign: boolean;
  canWork: boolean;
  canValidate: boolean;
  destinationAreaName: string;
  filerName: string;
  assigneeName?: string;
  pendingTasksCount?: number;
}

export default function WorkflowActions({
  requestId,
  currentStatus,
  availableUsers,
  currentAssigneeId,
  canAssign,
  canWork,
  canValidate,
  destinationAreaName,
  filerName,
  assigneeName,
  pendingTasksCount = 0,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<{
    status: RequestStatus;
    title: string;
    description: string;
    requireNote: boolean;
    requireLink: boolean;
    buttonText: string;
  } | null>(null);

  const [selectedAssignee, setSelectedAssignee] = useState(
    currentAssigneeId ?? (availableUsers[0]?.id || "")
  );
  const [note, setNote] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalUrlName, setExternalUrlName] = useState("");

  const handleStatusChange = async (
    newStatus: RequestStatus,
    extraData?: { note?: string; assigneeId?: string; url?: string; urlName?: string }
  ) => {
    setIsPending(true);
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("newStatus", newStatus);
    if (extraData?.note) fd.set("note", extraData.note);
    if (extraData?.assigneeId) fd.set("assigneeId", extraData.assigneeId);
    if (extraData?.url) fd.set("externalUrl", extraData.url);
    if (extraData?.urlName) fd.set("externalUrlName", extraData.urlName);

    try {
      await updateRequestStatus(fd);
      setShowAssignModal(false);
      setShowActionModal(null);
      setNote("");
      setExternalUrl("");
      setExternalUrlName("");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="pt-4 border-t border-blue-200 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-950 block">
            Acciones de Gestión de Estado
          </span>
          <p className="text-xs text-slate-600">
            Opciones operativas habilitadas según su rol y el estado actual de la solicitud.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {/* ESTADO: RADICADO */}
        {currentStatus === "FILED" && (
          canAssign ? (
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Asignar Operador Responsable
            </button>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">Pendiente de asignación:</span> Esta solicitud debe ser asignada a un operador por la Dirección del área de {destinationAreaName}.
            </div>
          )
        )}

        {/* ESTADO: ASIGNADO */}
        {currentStatus === "ASSIGNED" && (
          canWork ? (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("IN_PROGRESS", { note: "Inicio de atención y ejecución del requerimiento" })}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                Iniciar Atención (Pasar a En Proceso)
              </button>
              {canAssign && (
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="px-3 py-2 rounded-lg bg-white border border-blue-300 text-blue-950 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  Reasignar Operador
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">Asignada a {assigneeName || "Operador"}:</span> Pendiente de que el operador inicie el trabajo efectivo.
            </div>
          )
        )}

        {/* ESTADO: EN PROCESO */}
        {currentStatus === "IN_PROGRESS" && (
          canWork ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setShowActionModal({
                    status: "IN_REVIEW",
                    title: "Solicitar Información Adicional",
                    description:
                      "Se pondrá la solicitud en espera para que el solicitante suministre las aclaraciones o insumos requeridos.",
                    requireNote: true,
                    requireLink: false,
                    buttonText: "Enviar Solicitud de Información",
                  })
                }
                className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Solicitar Información al Solicitante
              </button>

              {pendingTasksCount > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-lg bg-slate-300 text-slate-600 text-xs font-semibold shadow-sm cursor-not-allowed opacity-75"
                    title="Complete todas las subtareas para habilitar la entrega"
                  >
                    Entregar Resultado al Solicitante
                  </button>
                  <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded">
                    Hay {pendingTasksCount} subtarea(s) pendiente(s) por completar
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setShowActionModal({
                      status: "DELIVERED",
                      title: "Entregar Solicitud al Solicitante",
                      description:
                        "Finaliza el tiempo principal de ejecución y presenta el resultado al solicitante para su validación.",
                      requireNote: false,
                      requireLink: true,
                      buttonText: "Confirmar Entrega de Resultado",
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Entregar Resultado al Solicitante
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">En ejecución:</span> La solicitud está siendo trabajada por el operador {assigneeName || ""}.
            </div>
          )
        )}

        {/* ESTADO: EN REVISIÓN (Esperando respuesta del solicitante) */}
        {currentStatus === "IN_REVIEW" && (
          canValidate ? (
            <button
              type="button"
              onClick={() =>
                setShowActionModal({
                  status: "RESUBMITTED",
                  title: "Reenviar Información Solicitada",
                  description:
                    "Proporcione la información o insumos requeridos para que el operador continúe con la atención.",
                  requireNote: true,
                  requireLink: true,
                  buttonText: "Reenviar al Operador",
                })
              }
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Reenviar Información Solicitada
            </button>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">En espera del solicitante ({filerName}):</span> Pendiente de que el solicitante remita la información adicional requerida.
            </div>
          )
        )}

        {/* ESTADO: REENVIADA (Operador retoma) */}
        {currentStatus === "RESUBMITTED" && (
          canWork ? (
            <button
              type="button"
              onClick={() =>
                handleStatusChange("IN_PROGRESS", {
                  note: "Operador reanuda la ejecución tras recibir la información complementaria.",
                })
              }
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              Reanudar Trabajo (Pasar a En Proceso)
            </button>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">Información reenviada:</span> El operador asignado ({assigneeName}) debe reanudar la solicitud.
            </div>
          )
        )}

        {/* ESTADO: ENTREGADO O POR CONFIRMAR */}
        {(currentStatus === "DELIVERED" || currentStatus === "PENDING_CONFIRMATION") && (
          canValidate ? (
            <>
              <button
                type="button"
                onClick={() =>
                  handleStatusChange("CLOSED", {
                    note: "Entrega recibida a satisfacción. Solicitud cerrada formalmente.",
                  })
                }
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                Confirmar Satisfacción y Cerrar
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowActionModal({
                    status: "RETURNED",
                    title: "Devolver Solicitud por Ajustes",
                    description:
                      "Indique las observaciones o correcciones requeridas para que el operador realice los ajustes necesarios.",
                    requireNote: true,
                    requireLink: true,
                    buttonText: "Devolver con Observaciones",
                  })
                }
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Devolver por Ajustes
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">Resultado entregado:</span> Pendiente de validación final y confirmación de satisfacción por parte del solicitante ({filerName}).
            </div>
          )
        )}

        {/* ESTADO: DEVUELTO */}
        {currentStatus === "RETURNED" && (
          canWork ? (
            <button
              type="button"
              onClick={() =>
                handleStatusChange("IN_PROGRESS", {
                  note: "Inicio de nuevo ciclo de trabajo para subsanar observaciones de la devolución.",
                })
              }
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              Iniciar Corrección (Pasar a En Proceso)
            </button>
          ) : (
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-200 w-full">
              <span className="font-semibold text-blue-950">Devuelto para ajustes:</span> El operador asignado ({assigneeName}) debe iniciar las correcciones solicitadas.
            </div>
          )
        )}

        {/* ESTADO: CERRADO */}
        {currentStatus === "CLOSED" && (
          <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-300 w-full">
            <span className="font-semibold text-slate-900">Solicitud Finalizada:</span> Este requerimiento se encuentra cerrado formalmente a satisfacción.
          </div>
        )}
      </div>

      {/* Modal de Asignación de Operador */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-blue-200 shadow-xl">
            <h3 className="text-base font-bold text-blue-950">
              Asignación de Operador Responsable
            </h3>
            <p className="text-xs text-slate-600">
              Seleccione el operador del área de {destinationAreaName} que asumirá la ejecución.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operador del Área
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableUsers.length === 0 ? (
                  <option value="">No hay personas registradas en el área de {destinationAreaName}</option>
                ) : (
                  availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota de asignación (Opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Instrucciones iniciales para el operador..."
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !selectedAssignee}
                onClick={() =>
                  handleStatusChange("ASSIGNED", {
                    assigneeId: selectedAssignee,
                    note: note || "Asignación inicial realizada por la Dirección de Área",
                  })
                }
                className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transición */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-blue-200 shadow-xl">
            <h3 className="text-base font-bold text-blue-950">
              {showActionModal.title}
            </h3>
            <p className="text-xs text-slate-600">{showActionModal.description}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observaciones {showActionModal.requireNote && "(Obligatorio)"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required={showActionModal.requireNote}
                rows={3}
                placeholder="Describa los detalles o especificaciones correspondientes..."
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Inclusión de Enlace / Repositorio */}
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2">
              <span className="text-xs font-bold text-blue-950 block">
                Enlace a Repositorio o Nube (Opcional)
              </span>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://drive.google.com/... o dirección de repositorio"
                className="w-full rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
              <input
                type="text"
                value={externalUrlName}
                onChange={(e) => setExternalUrlName(e.target.value)}
                placeholder="Etiqueta del enlace (ej: Entrega final / Insumos adicionados)"
                className="w-full rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowActionModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || (showActionModal.requireNote && !note.trim())}
                onClick={() =>
                  handleStatusChange(showActionModal.status, {
                    note,
                    url: externalUrl,
                    urlName: externalUrlName,
                  })
                }
                className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50"
              >
                {isPending ? "Procesando..." : showActionModal.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
