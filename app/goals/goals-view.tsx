"use client";

import { useState } from "react";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  createGoalTask,
  updateGoalTaskStatus,
  deleteGoalTask,
} from "./actions";

export interface GoalTaskItem {
  id: string;
  goalId: string;
  title: string;
  status: string; // "pendiente" | "completada"
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  scope: string;
  horizon: string;
  period: string;
  startDate: Date | string;
  endDate: Date | string;
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
  tasks: GoalTaskItem[];
  progressUpdates: Array<{
    id: string;
    previousValue: number;
    newValue: number;
    note: string;
    createdAt: Date | string;
    user: { id: string; name: string };
  }>;
}

export interface UserWithAreasItem {
  id: string;
  name: string;
  email: string;
  areas: Array<{ areaId: string }>;
  roles?: Array<{ role: { name: string } }>;
}

interface Props {
  initialGoals: GoalItem[];
  areas: Array<{ id: string; name: string; code: string }>;
  directorsAndManagers: UserWithAreasItem[];
  availableUsers: UserWithAreasItem[];
  currentUserId: string;
  canManage: boolean;
  isGerencia: boolean;
  userAreaIds: string[];
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
  availableUsers,
  currentUserId,
  canManage,
  isGerencia,
  userAreaIds,
}: Props) {
  // Filtros
  const [selectedScope, setSelectedScope] = useState("all");
  const [selectedHorizon, setSelectedHorizon] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales y estados de Objetivo
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});
  const [isPending, setIsPending] = useState(false);

  // Estados para agregar avance adicional en tarjeta
  const [activeAddGoalId, setActiveAddGoalId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskNotice, setTaskNotice] = useState<{ goalId: string; message: string } | null>(null);

  // Campos formulario Objetivo
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formScope, setFormScope] = useState(isGerencia ? "Gerencial" : "Área");
  const [formHorizon, setFormHorizon] = useState("Corto Plazo");
  const [formPeriod, setFormPeriod] = useState("Q1 2026");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [formIndicator, setFormIndicator] = useState("Avances y Cumplimiento Operativo");
  const [formAreaId, setFormAreaId] = useState(areas[0]?.id || "");
  const [formResponsibleId, setFormResponsibleId] = useState("");
  const [formStatus, setFormStatus] = useState("En Curso");

  // Lista dinámica de avances iniciales requeridos al crear un objetivo
  const [initialTasks, setInitialTasks] = useState<Array<{ title: string; assignedToId: string }>>([
    { title: "", assignedToId: "" },
  ]);

  // SEGREGACIÓN POR ÁREA: Filtro de personal por área respectiva
  const getAreaPersonnel = (areaId: string | null) => {
    if (!areaId) {
      // Para objetivos de alcance Gerencial Transversal, Gerencia puede seleccionar de todo el personal
      return availableUsers;
    }
    // Para objetivos de Área, SOLO el personal que pertenece a esa área
    return availableUsers.filter((u) => u.areas.some((ua) => ua.areaId === areaId));
  };

  const getAreaResponsibleCandidates = (areaId: string | null) => {
    if (!areaId) {
      return directorsAndManagers;
    }
    // Candidatos directores del área
    const areaDirectors = directorsAndManagers.filter((u) =>
      u.areas.some((ua) => ua.areaId === areaId)
    );
    if (areaDirectors.length > 0) return areaDirectors;
    // En ausencia de director específico, permitir cualquier miembro del área
    return getAreaPersonnel(areaId);
  };

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
    const defaultScope = isGerencia ? "Área" : "Área";
    setFormScope(defaultScope);
    setFormHorizon("Corto Plazo");
    setFormPeriod("Q1 2026");
    setFormStartDate(todayStr);

    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    const fy = future.getFullYear();
    const fm = String(future.getMonth() + 1).padStart(2, "0");
    const fd = String(future.getDate()).padStart(2, "0");
    setFormEndDate(`${fy}-${fm}-${fd}`);

    const defaultArea = areas[0]?.id || "";
    setFormAreaId(defaultArea);

    const candidates = getAreaResponsibleCandidates(defaultArea);
    setFormResponsibleId(candidates[0]?.id || "");

    setFormIndicator("Avances y Cumplimiento Operativo");
    setFormStatus("En Curso");
    setInitialTasks([{ title: "", assignedToId: "" }]);
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
    setFormAreaId(goal.areaId || (areas[0]?.id || ""));
    setFormResponsibleId(goal.responsibleId);
    setFormStatus(goal.status);
    setGoalModalOpen(true);
  };

  // Cambio de Área en el modal (recalcula personal asignable del área)
  const handleModalAreaChange = (newAreaId: string) => {
    setFormAreaId(newAreaId);
    const candidates = getAreaResponsibleCandidates(newAreaId);
    if (!candidates.some((c) => c.id === formResponsibleId)) {
      setFormResponsibleId(candidates[0]?.id || "");
    }
    // Si algún avance tenía un operador de otra área, resetear asignación
    const validAreaUsers = getAreaPersonnel(newAreaId);
    const updated = initialTasks.map((t) => {
      if (t.assignedToId && !validAreaUsers.some((u) => u.id === t.assignedToId)) {
        return { ...t, assignedToId: "" };
      }
      return t;
    });
    setInitialTasks(updated);
  };

  // Cambio de Ámbito en el modal
  const handleModalScopeChange = (newScope: string) => {
    setFormScope(newScope);
    const targetAreaId = newScope === "Gerencial" ? null : formAreaId;
    const candidates = getAreaResponsibleCandidates(targetAreaId);
    setFormResponsibleId(candidates[0]?.id || "");
  };

  // Manejo de lista dinámica de avances al crear
  const handleAddInitialTaskRow = () => {
    setInitialTasks([...initialTasks, { title: "", assignedToId: "" }]);
  };

  const handleRemoveInitialTaskRow = (index: number) => {
    if (initialTasks.length <= 1) return;
    setInitialTasks(initialTasks.filter((_, i) => i !== index));
  };

  const handleInitialTaskChange = (index: number, field: "title" | "assignedToId", val: string) => {
    const updated = [...initialTasks];
    updated[index][field] = val;
    setInitialTasks(updated);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPeriod.trim() || !formIndicator.trim()) {
      alert("Por favor complete los campos obligatorios del objetivo.");
      return;
    }

    if (!editingGoal) {
      const validTasks = initialTasks.filter((t) => t.title.trim().length > 0);
      if (validTasks.length === 0) {
        alert("Debe registrar al menos un avance para definir el cumplimiento del 100% de este objetivo.");
        return;
      }
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
    if (formScope === "Área") fd.set("areaId", formAreaId);
    fd.set("responsibleId", formResponsibleId);
    fd.set("status", formStatus);

    if (!editingGoal) {
      const validTasks = initialTasks.filter((t) => t.title.trim().length > 0);
      fd.set("tasks", JSON.stringify(validTasks));
    }

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

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este objetivo estratégico? Se eliminarán también todos sus avances asociados.")) return;
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

  // Creación de avance adicional desde la tarjeta
  const handleCreateAdditionalTask = async (goalId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsTaskSubmitting(true);
    const fd = new FormData();
    fd.set("goalId", goalId);
    fd.set("title", newTaskTitle);
    if (newTaskAssigneeId) fd.set("assignedToId", newTaskAssigneeId);

    try {
      await createGoalTask(fd);
      setNewTaskTitle("");
      setNewTaskAssigneeId("");
      setActiveAddGoalId(null);
      setTaskNotice(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al agregar el avance adicional.";
      setTaskNotice({ goalId, message: msg });
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  // Marcar avance como cumplido o reabrir
  const handleToggleTaskStatus = async (taskId: string, goalId: string, currentStatus: string) => {
    setTaskNotice(null);
    const newStatus = currentStatus === "completada" ? "pendiente" : "completada";

    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("goalId", goalId);
    fd.set("newStatus", newStatus);

    try {
      await updateGoalTaskStatus(fd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar el avance.";
      setTaskNotice({ goalId, message: msg });
    }
  };

  // Eliminación de avance
  const handleDeleteTask = async (taskId: string, goalId: string) => {
    if (!confirm("¿Desea eliminar este avance? El porcentaje de cumplimiento del 100% se recalculará automáticamente entre los avances restantes.")) return;
    setTaskNotice(null);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("goalId", goalId);

    try {
      await deleteGoalTask(fd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar el avance.";
      setTaskNotice({ goalId, message: msg });
    }
  };

  // Filtrado de objetivos en pantalla
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
        (goal.area && goal.area.name.toLowerCase().includes(q)) ||
        (goal.tasks && goal.tasks.some((t) => t.title.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  // Métricas generales dinámicas
  const totalGoals = initialGoals.length;
  const completedGoals = initialGoals.filter((g) => {
    const totalT = g.tasks?.length || 0;
    const compT = g.tasks?.filter((t) => t.status === "completada").length || 0;
    return (totalT > 0 && compT === totalT) || g.status === "Cumplido";
  }).length;

  const inProgressGoals = initialGoals.filter((g) => {
    const totalT = g.tasks?.length || 0;
    const compT = g.tasks?.filter((t) => t.status === "completada").length || 0;
    const isComp = (totalT > 0 && compT === totalT) || g.status === "Cumplido";
    return !isComp && (g.status === "En Curso" || totalT > 0);
  }).length;

  const atRiskGoals = initialGoals.filter((g) => g.status === "En Riesgo").length;

  let globalProgressSum = 0;
  for (const g of initialGoals) {
    const totalT = g.tasks?.length || 0;
    const compT = g.tasks?.filter((t) => t.status === "completada").length || 0;
    const p = totalT > 0 ? (compT / totalT) * 100 : g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
    globalProgressSum += Math.min(100, Math.max(0, p));
  }
  const globalProgressRate = totalGoals > 0 ? Math.round(globalProgressSum / totalGoals) : 0;

  // Cálculo en vivo para modal de creación
  const validInitialTasksCount = initialTasks.filter((t) => t.title.trim().length > 0).length;
  const initialTaskWeight = validInitialTasksCount > 0 ? (100 / validInitialTasksCount).toFixed(1) : "0.0";

  // Personal disponible para asignar en el modal según el área seleccionada
  const modalCurrentAreaId = formScope === "Gerencial" ? null : formAreaId;
  const modalAreaPersonnel = getAreaPersonnel(modalCurrentAreaId);
  const modalResponsibleCandidates = getAreaResponsibleCandidates(modalCurrentAreaId);

  return (
    <div className="space-y-6">
      {/* Barra de Control, KPIs y Filtros Dinámicos */}
      <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/70 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              {isGerencia
                ? "Gestión y Seguimiento de Objetivos (Todas las Áreas)"
                : "Gestión y Seguimiento de Objetivos de su Área"}
            </span>
            <span className="text-xs text-slate-600">
              Cumplimiento del 100% calculado dinámicamente según los avances planificados y cumplidos en su departamento.
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
            <span className="text-[11px] text-slate-500 block">Cumplidos (100%)</span>
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
              placeholder="Título, indicador o avance..."
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
              {isGerencia && <option value="Gerencial">Gerencial Transversal</option>}
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
            <label className="block font-semibold text-slate-700 mb-1">
              {isGerencia ? "Área Funcional" : "Mi Área"}
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              {isGerencia ? (
                <>
                  <option value="all">Todas las áreas</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </>
              ) : (
                <>
                  {areas.length > 1 && <option value="all">Mis áreas asignadas</option>}
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </>
              )}
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
          No hay objetivos registrados que coincidan con los filtros seleccionados o autorizados para su perfil.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const tasksList = goal.tasks || [];
            const totalTasks = tasksList.length;
            const completedTasks = tasksList.filter((t) => t.status === "completada").length;

            const progress =
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : goal.targetValue > 0
                ? Math.min(100, Math.max(0, Math.round((goal.currentValue / goal.targetValue) * 100)))
                : 0;

            const taskWeight = totalTasks > 0 ? (100 / totalTasks).toFixed(1) : "0.0";
            const isHistoryOpen = !!expandedHistories[goal.id];
            const isAddingTask = activeAddGoalId === goal.id;
            const hasNotice = taskNotice?.goalId === goal.id;

            const canManageThisGoal =
              isGerencia ||
              (goal.areaId ? userAreaIds.includes(goal.areaId) : false) ||
              goal.responsibleId === currentUserId;

            // Personal específico del área de este objetivo para asignación de avances
            const goalAreaUsers = getAreaPersonnel(goal.areaId);

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

                  {/* Indicador y Barra de Progreso hacia el 100% */}
                  <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200/80 space-y-2">
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
                          Avances Cumplidos vs Meta
                        </span>
                        <span className="font-mono font-bold text-blue-950 text-xs">
                          {completedTasks} de {totalTasks} avances ({progress}%)
                        </span>
                      </div>
                    </div>

                    {/* Barra visual de progreso */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
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
                        <span>
                          Cumplimiento: {progress}% {totalTasks > 0 && `(Cada avance aporta ${taskWeight}%)`}
                        </span>
                        <span>
                          {new Date(goal.startDate).toLocaleDateString("es-ES")} -{" "}
                          {new Date(goal.endDate).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alerta de notificación de error o regla si la hay */}
                  {hasNotice && (
                    <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-950 flex items-center justify-between gap-2 shadow-2xs">
                      <span>{taskNotice.message}</span>
                      <button
                        type="button"
                        onClick={() => setTaskNotice(null)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-xs px-2 py-0.5 rounded hover:bg-rose-100"
                      >
                        Cerrar
                      </button>
                    </div>
                  )}

                  {/* SECCIÓN DE AVANCES: SOLO PERSONAL DEL ÁREA */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-950">
                          Avances para el 100% del Objetivo
                        </span>
                        <span className="text-[10px] font-semibold text-slate-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full">
                          {completedTasks}/{totalTasks} cumplidos
                        </span>
                      </div>

                      {canManageThisGoal && !isAddingTask && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAddGoalId(goal.id);
                            setNewTaskTitle("");
                            setNewTaskAssigneeId("");
                            setTaskNotice(null);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold shadow-2xs transition-colors"
                        >
                          + Agregar Avance
                        </button>
                      )}
                    </div>

                    {/* Formulario para agregar avance adicional */}
                    {isAddingTask && (
                      <form
                        onSubmit={(e) => handleCreateAdditionalTask(goal.id, e)}
                        className="bg-white p-3 rounded-lg border border-blue-300 space-y-2.5 shadow-2xs"
                      >
                        <span className="text-[11px] font-bold text-blue-950 block">
                          Nuevo Avance para Reconsiderar el 100%
                        </span>
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Descripción clara del avance o entregable adicional..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full rounded-md border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                            Operador del Área Asignado (Solo miembros de {goal.area?.name || "este objetivo"})
                          </label>
                          <select
                            value={newTaskAssigneeId}
                            onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                            className="w-full rounded-md border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Sin operador específico --</option>
                            {goalAreaUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="p-2 bg-blue-50/50 rounded text-[10px] text-blue-900">
                          Al agregar este avance, el total del objetivo será reconsiderado a {totalTasks + 1} avances (cada uno aportará el {(100 / (totalTasks + 1)).toFixed(1)}% al cumplimiento total).
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAddGoalId(null);
                              setNewTaskTitle("");
                              setNewTaskAssigneeId("");
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isTaskSubmitting || !newTaskTitle.trim()}
                            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                          >
                            {isTaskSubmitting ? "Guardando..." : "Guardar Avance y Recalcular"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Lista de avances con botón único Marcar Cumplido / Reabrir Avance */}
                    {tasksList.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50/70 p-3 rounded-lg border border-slate-200 text-center">
                        No hay avances registrados en este objetivo. Agregue avances para alimentar automáticamente la barra de cumplimiento.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {tasksList.map((task) => {
                          const isCompleted = task.status === "completada";
                          const isAssignedToMe = task.assignedToId === currentUserId;
                          const canToggle = canManageThisGoal || isAssignedToMe;

                          return (
                            <div
                              key={task.id}
                              className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-colors ${
                                isCompleted
                                  ? "bg-emerald-50/60 border-emerald-200"
                                  : "bg-slate-50/90 border-slate-200"
                              }`}
                            >
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs font-semibold ${
                                      isCompleted ? "text-slate-500 line-through" : "text-slate-900"
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${
                                      isCompleted
                                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                        : "bg-slate-100 text-slate-700 border-slate-300"
                                    }`}
                                  >
                                    {isCompleted ? "Cumplido" : "Pendiente"}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                                  {task.assignedTo ? (
                                    <span>
                                      Responsable: <strong className="text-slate-700">{task.assignedTo.name}</strong>
                                    </span>
                                  ) : (
                                    <span className="italic text-slate-400">Sin operador específico</span>
                                  )}

                                  {isCompleted && task.completedAt && (
                                    <span className="text-emerald-800 font-medium">
                                      (Cumplido el {new Date(task.completedAt).toLocaleDateString("es-ES")})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Acciones del avance */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {canToggle && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaskStatus(task.id, goal.id, task.status)}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors shadow-2xs ${
                                      isCompleted
                                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                                    }`}
                                  >
                                    {isCompleted ? "Reabrir Avance" : "Marcar Cumplido"}
                                  </button>
                                )}

                                {canManageThisGoal && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id, goal.id)}
                                    className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Eliminar avance y recalcular total"
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

                  {/* Responsable del Objetivo y Enlace de Bitácora */}
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>
                      Responsable del Objetivo: <strong className="text-slate-900">{goal.responsible.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHistory(goal.id)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                    >
                      {isHistoryOpen ? "Ocultar Bitácora ↑" : `Bitácora de Cumplimiento (${goal.progressUpdates.length}) ↓`}
                    </button>
                  </div>

                  {/* Bitácora de Avances Plegable */}
                  {isHistoryOpen && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                      <span className="font-bold text-blue-950 uppercase tracking-wider text-[10px] block">
                        Línea Temporal de Cumplimiento de Avances
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
                                  {up.previousValue} → {up.newValue} avances cumplidos
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
                  {canManageThisGoal ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                    >
                      Eliminar Objetivo
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {canManageThisGoal && (
                      <button
                        type="button"
                        onClick={() => openEditGoalModal(goal)}
                        className="px-3 py-1 rounded border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-semibold text-[11px] shadow-2xs transition-colors"
                      >
                        Editar Objetivo
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
          MODAL: DEFINIR / EDITAR OBJETIVO ESTRATÉGICO
          ============================================================ */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[92vh] overflow-y-auto text-xs">
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
                  placeholder="Ej: Reducir el tiempo promedio de atención de solicitudes operativas"
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
                    onChange={(e) => handleModalScopeChange(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {isGerencia && <option value="Gerencial">Gerencial Transversal</option>}
                    <option value="Área">Específico de Área</option>
                  </select>
                </div>

                {formScope === "Área" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Área Asignada</label>
                    <select
                      value={formAreaId}
                      onChange={(e) => handleModalAreaChange(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                    >
                      {areas.map((a) => (
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Indicador o Métrica Estratégica *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Avances y Cumplimiento Operativo / Plan de Ejecución"
                  value={formIndicator}
                  onChange={(e) => setFormIndicator(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              {/* SECCIÓN OBLIGATORIA DE AVANCES INICIALES (SOLO AL CREAR) */}
              {!editingGoal && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-200/70 pb-2">
                    <div>
                      <span className="font-bold text-blue-950 block text-xs">
                        Plan de Avances de Cumplimiento (Obligatorio para el 100%)
                      </span>
                      <p className="text-[11px] text-slate-600">
                        Cada avance aportará un porcentaje equitativo hacia el 100%. Los operadores disponibles corresponden estrictamente al área seleccionada.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddInitialTaskRow}
                      className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold shadow-2xs transition-colors self-start sm:self-auto"
                    >
                      + Agregar otro avance
                    </button>
                  </div>

                  <div className="space-y-2">
                    {initialTasks.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-200">
                        <span className="text-[11px] font-bold text-blue-950 font-mono w-16 text-center shrink-0">
                          Avance #{idx + 1}
                        </span>

                        <input
                          type="text"
                          required
                          placeholder={`Descripción del avance ${idx + 1}...`}
                          value={t.title}
                          onChange={(e) => handleInitialTaskChange(idx, "title", e.target.value)}
                          className="flex-1 rounded border border-blue-300 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />

                        <select
                          value={t.assignedToId}
                          onChange={(e) => handleInitialTaskChange(idx, "assignedToId", e.target.value)}
                          className="w-48 rounded border border-blue-300 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
                        >
                          <option value="">-- Sin asignar --</option>
                          {modalAreaPersonnel.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>

                        {initialTasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInitialTaskRow(idx)}
                            className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                            title="Quitar este avance"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumen dinámico del aporte porcentual por avance */}
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">
                      Total avances iniciales: <strong className="text-blue-950">{validInitialTasksCount}</strong>
                    </span>
                    <span className="font-semibold text-blue-900">
                      Cada avance cumplido sumará el <strong className="text-blue-950 font-mono">{initialTaskWeight}%</strong> al cumplimiento del objetivo
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsable del Objetivo *
                  </label>
                  <select
                    value={formResponsibleId}
                    onChange={(e) => setFormResponsibleId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {modalResponsibleCandidates.map((u) => (
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
                  disabled={isPending || (!editingGoal && validInitialTasksCount === 0)}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending
                    ? "Guardando..."
                    : editingGoal
                    ? "Guardar Cambios"
                    : `Crear Objetivo (${validInitialTasksCount} avances - 100%)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
