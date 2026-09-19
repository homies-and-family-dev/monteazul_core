"use client";

import { useState } from "react";
import { createGoal, updateGoal, recordGoalProgress, deleteGoal } from "./actions";

export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  scope: string;
  horizon: string;
  period: string;
  startDate: Date;
  endDate: Date;
  indicator: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
  areaId: string | null;
  area: { id: string; name: string; code: string } | null;
  responsibleId: string;
  responsible: { id: string; name: string; email: string };
  createdById: string;
  createdBy: { id: string; name: string };
  progressUpdates: Array<{
    id: string;
    previousValue: number;
    newValue: number;
    note: string;
    createdAt: Date;
    user: { id: string; name: string };
  }>;
}

interface Props {
  initialGoals: GoalItem[];
  areas: Array<{ id: string; name: string; code: string }>;
  directorsAndManagers: Array<{ id: string; name: string; email: string }>;
  canManage: boolean;
  isGeneralAdmin: boolean;
  userDirectorAreaIds: string[];
}

const HORIZONS = ["Corto Plazo", "Mediano Plazo", "Largo Plazo"];
const STATUSES = ["En Curso", "Cumplido", "En Riesgo", "No Cumplido", "Pausado"];

function getGoalStatusStyle(status: string) {
  switch (status) {
    case "Cumplido":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "En Curso":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "En Riesgo":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "No Cumplido":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "Pausado":
      return "bg-slate-100 text-slate-800 border-slate-300";
    default:
      return "bg-blue-100 text-blue-900 border-blue-200";
  }
}

export default function GoalsView({
  initialGoals,
  areas,
  directorsAndManagers,
  canManage,
  isGeneralAdmin,
  userDirectorAreaIds,
}: Props) {
  // Filtros
  const [selectedScope, setSelectedScope] = useState("all");
  const [selectedHorizon, setSelectedHorizon] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales y estados
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);

  const [progressModalGoal, setProgressModalGoal] = useState<GoalItem | null>(null);
  const [progressNewValue, setProgressNewValue] = useState("");
  const [progressNote, setProgressNote] = useState("");

  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});
  const [isPending, setIsPending] = useState(false);

  // Campos formulario Objetivo
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formScope, setFormScope] = useState("Área");
  const [formHorizon, setFormHorizon] = useState("Corto Plazo");
  const [formPeriod, setFormPeriod] = useState("Q1 2026");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [formIndicator, setFormIndicator] = useState("Tasa de Cierre a Satisfacción");
  const [formTargetValue, setFormTargetValue] = useState("90");
  const [formCurrentValue, setFormCurrentValue] = useState("0");
  const [formUnit, setFormUnit] = useState("%");
  const [formAreaId, setFormAreaId] = useState(areas[0]?.id || "");
  const [formResponsibleId, setFormResponsibleId] = useState(directorsAndManagers[0]?.id || "");
  const [formStatus, setFormStatus] = useState("En Curso");

  const toggleHistory = (goalId: string) => {
    setExpandedHistories((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  const openCreateGoalModal = () => {
    setEditingGoal(null);
    setFormTitle("");
    setFormDescription("");
    setFormScope("Área");
    setFormHorizon("Corto Plazo");
    setFormPeriod("Q1 2026");
    setFormStartDate(todayStr);

    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    const fy = future.getFullYear();
    const fm = String(future.getMonth() + 1).padStart(2, "0");
    const fd = String(future.getDate()).padStart(2, "0");
    setFormEndDate(`${fy}-${fm}-${fd}`);

    setFormIndicator("Tasa de Cierre a Satisfacción");
    setFormTargetValue("90");
    setFormCurrentValue("0");
    setFormUnit("%");
    setFormAreaId(areas[0]?.id || "");
    setFormResponsibleId(directorsAndManagers[0]?.id || "");
    setFormStatus("En Curso");
    setGoalModalOpen(true);
  };

  const openEditGoalModal = (goal: GoalItem) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description || "");
    setFormScope(goal.scope);
    setFormHorizon(goal.horizon);
    setFormPeriod(goal.period);
    setFormStartDate(new Date(goal.startDate).toISOString().slice(0, 10));
    setFormEndDate(new Date(goal.endDate).toISOString().slice(0, 10));
    setFormIndicator(goal.indicator);
    setFormTargetValue(String(goal.targetValue));
    setFormCurrentValue(String(goal.currentValue));
    setFormUnit(goal.unit);
    setFormAreaId(goal.areaId || (areas[0]?.id || ""));
    setFormResponsibleId(goal.responsibleId);
    setFormStatus(goal.status);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPeriod.trim() || !formIndicator.trim()) {
      alert("Por favor complete los campos obligatorios del objetivo.");
      return;
    }

    if (!editingGoal && formEndDate < todayStr) {
      alert("Inconsistencia de fecha: La fecha límite proyectada para el objetivo no puede ser anterior a la fecha actual.");
      return;
    }

    if (formEndDate < formStartDate) {
      alert("Inconsistencia de fecha: La fecha límite debe ser posterior o igual a la fecha de inicio del objetivo.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    if (editingGoal) fd.set("id", editingGoal.id);
    fd.set("title", formTitle);
    if (formDescription) fd.set("description", formDescription);
    fd.set("scope", formScope);
    fd.set("horizon", formHorizon);
    fd.set("period", formPeriod);
    fd.set("startDate", formStartDate);
    fd.set("endDate", formEndDate);
    fd.set("indicator", formIndicator);
    fd.set("targetValue", formTargetValue);
    fd.set("currentValue", formCurrentValue);
    fd.set("unit", formUnit);
    if (formScope === "Área") fd.set("areaId", formAreaId);
    fd.set("responsibleId", formResponsibleId);
    fd.set("status", formStatus);

    try {
      if (editingGoal) {
        await updateGoal(fd);
      } else {
        await createGoal(fd);
      }
      setGoalModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el objetivo.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalGoal || !progressNote.trim()) {
      alert("Por favor ingrese el nuevo valor y la justificación del avance.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.set("goalId", progressModalGoal.id);
    fd.set("newValue", progressNewValue);
    fd.set("note", progressNote);

    try {
      await recordGoalProgress(fd);
      setProgressModalGoal(null);
      setProgressNewValue("");
      setProgressNote("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar el avance.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este objetivo estratégico?")) return;
    setIsPending(true);
    try {
      await deleteGoal(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar el objetivo.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  // Filtrado de objetivos
  const filteredGoals = initialGoals.filter((goal) => {
    if (selectedScope !== "all" && goal.scope !== selectedScope) return false;
    if (selectedHorizon !== "all" && goal.horizon !== selectedHorizon) return false;
    if (selectedStatus !== "all" && goal.status !== selectedStatus) return false;
    if (selectedArea !== "all" && goal.areaId !== selectedArea) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        goal.title.toLowerCase().includes(q) ||
        goal.indicator.toLowerCase().includes(q) ||
        goal.period.toLowerCase().includes(q) ||
        (goal.area && goal.area.name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Métricas generales
  const totalGoals = initialGoals.length;
  const completedGoals = initialGoals.filter((g) => g.status === "Cumplido").length;
  const inProgressGoals = initialGoals.filter((g) => g.status === "En Curso").length;
  const atRiskGoals = initialGoals.filter((g) => g.status === "En Riesgo").length;

  let globalProgressSum = 0;
  for (const g of initialGoals) {
    const p = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
    globalProgressSum += Math.min(100, Math.max(0, p));
  }
  const globalProgressRate = totalGoals > 0 ? Math.round(globalProgressSum / totalGoals) : 0;

  return (
    <div className="space-y-6">
      {/* Barra de Control, KPIs y Filtros Dinámicos */}
      <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/70 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              Gestión y Seguimiento de Objetivos Estratégicos
            </span>
            <span className="text-xs text-slate-600">
              Alineación de metas gerenciales y de área con indicadores cuantitativos y avances periódicos.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateGoalModal}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              + Nuevo Objetivo
            </button>
          )}
        </div>

        {/* Resumen de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">Total Objetivos</span>
            <span className="text-xl font-bold text-blue-950 font-mono">{totalGoals}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">Cumplidos</span>
            <span className="text-xl font-bold text-emerald-800 font-mono">{completedGoals}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">En Curso</span>
            <span className="text-xl font-bold text-blue-900 font-mono">{inProgressGoals}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">En Riesgo</span>
            <span className="text-xl font-bold text-amber-800 font-mono">{atRiskGoals}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-500 block">Avance Global</span>
            <span className="text-xl font-bold text-blue-950 font-mono">{globalProgressRate}%</span>
          </div>
        </div>

        {/* Filtros Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs pt-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Título, indicador o período..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ámbito</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="all">Todos los ámbitos</option>
              <option value="Gerencial">Gerencial Transversal</option>
              <option value="Área">Específico de Área</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Horizonte</label>
            <select
              value={selectedHorizon}
              onChange={(e) => setSelectedHorizon(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="all">Todos los horizontes</option>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Área</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="all">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="all">Todos los estados</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================
          TARJETAS DE OBJETIVOS ESTRATÉGICOS
          ============================================================ */}
      {filteredGoals.length === 0 ? (
        <div className="p-8 bg-white rounded-xl border border-blue-200 text-center text-xs text-slate-600">
          No hay objetivos registrados que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const progress =
              goal.targetValue > 0
                ? Math.min(100, Math.max(0, Math.round((goal.currentValue / goal.targetValue) * 100)))
                : 0;

            const isHistoryOpen = !!expandedHistories[goal.id];

            return (
              <div
                key={goal.id}
                className="bg-white p-5 rounded-xl border border-blue-200 shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2 border-b border-blue-100 pb-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          {goal.scope === "Gerencial" ? "Gerencial Transversal" : `Área: ${goal.area?.name || "Área"}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {goal.horizon}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white text-blue-900 border border-blue-200">
                          {goal.period}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-blue-950 leading-snug">
                        {goal.title}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${getGoalStatusStyle(
                        goal.status
                      )}`}
                    >
                      {goal.status}
                    </span>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Indicador Cuantitativo y Barra de Avance */}
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          Indicador Evaluado
                        </span>
                        <span className="font-bold text-blue-950">
                          {goal.indicator}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block font-medium">
                          Meta vs Actual
                        </span>
                        <span className="font-mono font-bold text-blue-950 text-xs">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                    </div>

                    {/* Barra visual de progreso */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            progress >= 100
                              ? "bg-emerald-600"
                              : progress < 50
                              ? "bg-amber-600"
                              : "bg-blue-700"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Avance: {progress}%</span>
                        <span>
                          {new Date(goal.startDate).toLocaleDateString("es-ES")} -{" "}
                          {new Date(goal.endDate).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>
                      Responsable: <strong className="text-slate-900">{goal.responsible.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHistory(goal.id)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                    >
                      {isHistoryOpen ? "Ocultar Bitácora ↑" : `Bitácora de Avances (${goal.progressUpdates.length}) ↓`}
                    </button>
                  </div>

                  {/* Bitácora de Avances Plegable */}
                  {isHistoryOpen && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                      <span className="font-bold text-blue-950 uppercase tracking-wider text-[10px] block">
                        Línea Temporal de Avances y Justificaciones
                      </span>

                      {goal.progressUpdates.length === 0 ? (
                        <span className="text-slate-400 italic text-[11px] block">
                          No se han registrado actualizaciones de avance todavía.
                        </span>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {goal.progressUpdates.map((up) => (
                            <div
                              key={up.id}
                              className="p-2 rounded bg-white border border-slate-200 text-[11px] space-y-1"
                            >
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-blue-950 font-bold">
                                  {up.previousValue} → {up.newValue} {goal.unit}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(up.createdAt).toLocaleString("es-ES", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-snug">
                                {up.note}
                              </p>
                              <span className="text-[10px] text-slate-500 block">
                                Registrado por: {up.user.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                    >
                      Eliminar
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openEditGoalModal(goal)}
                        className="px-2.5 py-1 rounded border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-semibold text-[11px]"
                      >
                        Editar
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setProgressModalGoal(goal);
                          setProgressNewValue(String(goal.currentValue));
                          setProgressNote("");
                        }}
                        className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] shadow-2xs"
                      >
                        + Registrar Avance
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          MODAL 1: REGISTRAR / EDITAR OBJETIVO
          ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                {editingGoal ? "Editar Objetivo Estratégico" : "Definir Nuevo Objetivo Estratégico"}
              </h3>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título del Objetivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Reducir el tiempo promedio de atención de solicitudes a menos de 24 horas"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción Detallada / Justificación
                </label>
                <textarea
                  rows={2}
                  placeholder="Explique el impacto operativo, justificación y alcance del objetivo..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ámbito</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {isGeneralAdmin && <option value="Gerencial">Gerencial Transversal</option>}
                    <option value="Área">Específico de Área</option>
                  </select>
                </div>

                {formScope === "Área" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Área Asignada</label>
                    <select
                      value={formAreaId}
                      onChange={(e) => setFormAreaId(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                    >
                      {areas
                        .filter((a) => isGeneralAdmin || userDirectorAreaIds.includes(a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horizonte Temporal</label>
                  <select
                    value={formHorizon}
                    onChange={(e) => setFormHorizon(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {HORIZONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Período de Evaluación *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Q1 2026, Año 2026, Semestre 1"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormStartDate(newStart);
                      if (formEndDate && formEndDate < newStart) {
                        setFormEndDate(newStart);
                      }
                    }}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Límite *</label>
                  <input
                    type="date"
                    required
                    min={editingGoal ? formStartDate : (formStartDate > todayStr ? formStartDate : todayStr)}
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Indicador y Metas */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="col-span-3">
                  <label className="block font-semibold text-blue-950 mb-1">
                    Indicador o Métrica a Evaluar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Tasa de Cierre a Satisfacción / Horas Promedio / Solicitudes"
                    value={formIndicator}
                    onChange={(e) => setFormIndicator(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Meta Cuantitativa *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 95"
                    value={formTargetValue}
                    onChange={(e) => setFormTargetValue(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valor Actual Inicial</label>
                  <input
                    type="number"
                    step="any"
                    value={formCurrentValue}
                    onChange={(e) => setFormCurrentValue(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad de Medida *</label>
                  <input
                    type="text"
                    required
                    placeholder="%, horas, solicitudes..."
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsable del Objetivo *</label>
                  <select
                    value={formResponsibleId}
                    onChange={(e) => setFormResponsibleId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {directorsAndManagers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : editingGoal ? "Guardar Cambios" : "Crear Objetivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: REGISTRAR AVANCE CUANTITATIVO EN BITÁCORA
          ============================================================ */}
      {progressModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-blue-200 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                  Actualización de Avance
                </span>
                <h3 className="text-base font-bold text-blue-950">
                  {progressModalGoal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalGoal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                <span className="text-[11px] text-slate-500 block">Indicador y Meta:</span>
                <span className="font-bold text-blue-950 block">
                  {progressModalGoal.indicator}
                </span>
                <span className="text-xs text-slate-700 font-mono block mt-0.5">
                  Valor anterior: {progressModalGoal.currentValue} {progressModalGoal.unit} | Meta: {progressModalGoal.targetValue} {progressModalGoal.unit}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nuevo Valor Alcanzado ({progressModalGoal.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ingrese el valor acumulado o actual..."
                  value={progressNewValue}
                  onChange={(e) => setProgressNewValue(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justificación / Acciones Implementadas *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explique las acciones tomadas para alcanzar este resultado o causas de posibles retrasos..."
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalGoal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Registrar en Bitácora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
