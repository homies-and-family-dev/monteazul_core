"use client";

import { useState } from "react";
import { addComment } from "../actions";

interface CommentItem {
  id: string;
  content: string;
  date: Date;
  user: {
    name: string;
  };
  files?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

interface TransitionItem {
  id: string;
  previousStatusLabel: string | null;
  newStatusLabel: string;
  date: Date;
  note: string | null;
  durationInStateText?: string;
  responsibleLabel: string;
  user: {
    name: string;
  };
}

interface Props {
  requestId: string;
  comments: CommentItem[];
  transitions: TransitionItem[];
  timesNode: React.ReactNode;
  tasksNode: React.ReactNode;
  linksNode: React.ReactNode;
  tasksCount: number;
  completedTasksCount: number;
  linksCount: number;
}

export default function CollapsiblePanels({
  requestId,
  comments,
  transitions,
  timesNode,
  tasksNode,
  linksNode,
  tasksCount,
  completedTasksCount,
  linksCount,
}: Props) {
  const [showTimes, setShowTimes] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const expandAll = () => {
    setShowTimes(true);
    setShowTasks(true);
    setShowLinks(true);
    setShowComments(true);
    setShowHistory(true);
  };

  const collapseAll = () => {
    setShowTimes(false);
    setShowTasks(false);
    setShowLinks(false);
    setShowComments(false);
    setShowHistory(false);
  };

  const openCount = [
    showTimes,
    showTasks,
    showLinks,
    showComments,
    showHistory,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Barra de Control de Recuadros Desplegables */}
      <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 pb-2.5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              Paneles y Recuadros de Gestión
            </span>
            <span className="text-[11px] text-slate-600">
              Despliegue u oculte los recuadros operativos para mantener la pantalla despejada.
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              {openCount} de 5 recuadros desplegados
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
            >
              Desplegar Todo
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
            >
              Ocultar Todo
            </button>
          </div>
        </div>

        {/* Botones de alternancia para cada recuadro */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {/* 1. Control Operativo y Medición de Tiempos */}
          <button
            type="button"
            onClick={() => setShowTimes(!showTimes)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              showTimes
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-blue-950 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {showTimes ? "Ocultar Control de Tiempos" : "Control Operativo y Tiempos"}
          </button>

          {/* 2. Subtareas Derivadas */}
          <button
            type="button"
            onClick={() => setShowTasks(!showTasks)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              showTasks
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-blue-950 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {showTasks
              ? `Ocultar Subtareas (${tasksCount})`
              : `Subtareas Derivadas (${completedTasksCount}/${tasksCount})`}
          </button>

          {/* 3. Repositorios y Enlaces Externos */}
          <button
            type="button"
            onClick={() => setShowLinks(!showLinks)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              showLinks
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-blue-950 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {showLinks
              ? `Ocultar Repositorios y Enlaces (${linksCount})`
              : `Repositorios y Enlaces (${linksCount})`}
          </button>

          {/* 4. Comunicación Contextual */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              showComments
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-blue-950 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {showComments
              ? `Ocultar Comunicación (${comments.length})`
              : `Comunicación Contextual (${comments.length})`}
          </button>

          {/* 5. Historial y Trazabilidad */}
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              showHistory
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-blue-950 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {showHistory
              ? `Ocultar Historial (${transitions.length})`
              : `Historial y Trazabilidad (${transitions.length})`}
          </button>
        </div>
      </div>

      {/* 1. Recuadro Desplegable: Control Operativo y Medición de Tiempos */}
      {showTimes && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowTimes(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Ocultar control de tiempos ↑
            </button>
          </div>
          {timesNode}
        </div>
      )}

      {/* 3. Recuadro Desplegable: Subtareas Derivadas */}
      {showTasks && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowTasks(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Ocultar subtareas ↑
            </button>
          </div>
          {tasksNode}
        </div>
      )}

      {/* 4. Recuadro Desplegable: Repositorios y Enlaces Externos */}
      {showLinks && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowLinks(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Ocultar repositorios y enlaces ↑
            </button>
          </div>
          {linksNode}
        </div>
      )}

      {/* 5. Recuadro Desplegable: Comunicación Contextual */}
      {showComments && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowComments(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Ocultar comunicación contextual ↑
            </button>
          </div>
          <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
            <div className="border-b border-blue-200 pb-2">
              <h3 className="text-sm font-bold text-blue-950">
                Comunicación Contextual de la Solicitud
              </h3>
              <p className="text-xs text-slate-600">
                Intercambio de mensajes, especificaciones y aclaraciones vinculadas formalmente al expediente.
              </p>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center bg-white rounded-lg border border-blue-100">
                  No hay mensajes registrados en esta solicitud.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-white border border-blue-200 space-y-1.5 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-bold text-blue-950">{c.user.name}</span>
                      <span>
                        {new Date(c.date).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                      {c.content}
                    </p>
                    {c.files && c.files.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {c.files.map((f) => (
                          <a
                            key={f.id}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px] font-semibold hover:underline"
                          >
                            Enlace: {f.name} [Abrir]
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Formulario para agregar mensaje */}
            <form
              action={addComment}
              className="pt-3 border-t border-blue-200 space-y-2 bg-white p-3 rounded-lg border"
            >
              <input type="hidden" name="requestId" value={requestId} />
              <textarea
                name="content"
                rows={2}
                required
                placeholder="Escriba un mensaje, aclaración o actualización..."
                className="w-full rounded-lg border border-blue-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="url"
                  name="externalUrl"
                  placeholder="https://drive.google.com/... o enlace de repositorio (opcional)"
                  className="w-full rounded border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                />
                <input
                  type="text"
                  name="externalUrlName"
                  placeholder="Nombre o etiqueta del enlace (opcional)"
                  className="w-full rounded border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Enviar Mensaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Recuadro Desplegable: Historial y Trazabilidad */}
      {showHistory && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Ocultar historial ↑
            </button>
          </div>
          <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
            <div className="border-b border-blue-200 pb-2">
              <h3 className="text-sm font-bold text-blue-950">
                Historial y Trazabilidad de Estados
              </h3>
              <p className="text-xs text-slate-600">
                Bitácora inmutable de cambios de estado, responsables en cada momento y tiempos de permanencia.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 bg-white p-4 rounded-lg border border-blue-200">
              {transitions.map((item) => (
                <div
                  key={item.id}
                  className="relative pl-5 pb-3 border-l-2 border-blue-400 text-xs space-y-1"
                >
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-700" />
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-bold text-blue-950">
                      {item.previousStatusLabel ? `${item.previousStatusLabel} → ` : ""}
                      <span className="text-blue-700">{item.newStatusLabel}</span>
                    </span>
                    <span>
                      {new Date(item.date).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <p className="text-slate-700">
                    Acción realizada por:{" "}
                    <span className="font-semibold text-slate-900">{item.user.name}</span>
                  </p>

                  <p className="text-[11px] text-slate-600">
                    Responsable en ese estado:{" "}
                    <span className="font-medium text-slate-800">{item.responsibleLabel}</span>
                  </p>

                  {item.durationInStateText && (
                    <p className="text-[11px] text-blue-900 font-semibold">
                      Tiempo de permanencia en este estado: {item.durationInStateText}
                    </p>
                  )}

                  {item.note && (
                    <p className="p-2 bg-blue-50/70 rounded border border-blue-200 text-slate-800 italic">
                      &quot;{item.note}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
