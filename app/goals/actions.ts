"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  // Perfil Gerencia / Administración General: único perfil con acceso transversal a todas las áreas
  const isGerencia =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia");

  const userAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];

  const canManageGoals =
    isGerencia ||
    permissionsList.includes("goals:manage") ||
    rolesList.some((r) => r.includes("Director")) ||
    userAreaIds.length > 0;

  return {
    userId: session.user.id,
    isGeneralAdmin: isGerencia,
    isGerencia,
    canManageGoals,
    userAreaIds,
    currentUser,
  };
}

async function checkGoalsAccess() {
  const user = await getAuthenticatedUser();
  if (!user.canManageGoals) {
    throw new Error("Acceso no autorizado para gestionar o crear Objetivos.");
  }
  return user;
}

export async function createGoal(formData: FormData) {
  const { userId, isGerencia, userAreaIds } = await checkGoalsAccess();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  let scope = (formData.get("scope") as string)?.trim() || "Área";
  const horizon = (formData.get("horizon") as string)?.trim() || "Corto Plazo";
  const period = (formData.get("period") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim();
  const indicator = (formData.get("indicator") as string)?.trim() || "Avances y Cumplimiento Operativo";
  let areaId = (formData.get("areaId") as string)?.trim() || null;
  const responsibleId = (formData.get("responsibleId") as string)?.trim() || userId;
  const status = (formData.get("status") as string)?.trim() || "En Curso";

  // Parsear avances iniciales obligatorios
  const rawTasks = (formData.get("tasks") as string)?.trim();
  let tasksList: Array<{ title: string; assignedToId?: string | null }> = [];
  if (rawTasks) {
    try {
      tasksList = JSON.parse(rawTasks);
    } catch {
      tasksList = [];
    }
  }

  // Filtrar títulos vacíos
  tasksList = tasksList.filter((t) => t.title && t.title.trim().length > 0);

  if (!title || !period || !startDateStr || !endDateStr) {
    throw new Error("Por favor complete los campos obligatorios del objetivo.");
  }

  if (tasksList.length === 0) {
    throw new Error(
      "Debe registrar al menos un avance. El cumplimiento del 100% del objetivo depende de los avances asignados."
    );
  }

  // REGLAS DE SEGREGACIÓN POR ÁREA:
  // Si no es Gerencia, únicamente puede crear objetivos de su área respectiva
  if (!isGerencia) {
    scope = "Área";
    if (!areaId || !userAreaIds.includes(areaId)) {
      throw new Error("Acceso denegado: solo puede registrar objetivos para su área asignada.");
    }
  }

  if (scope === "Gerencial") {
    if (!isGerencia) {
      throw new Error("Solo la Gerencia General puede crear objetivos de alcance gerencial transversal.");
    }
    areaId = null;
  }

  // Validar que el personal asignado en avances pertenezca al área seleccionada
  if (areaId) {
    for (const t of tasksList) {
      if (t.assignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: t.assignedToId },
          include: { areas: true },
        });
        if (!assignedUser?.areas.some((ua) => ua.areaId === areaId)) {
          throw new Error(
            `El personal asignado en "${t.title}" no pertenece al área asignada del objetivo.`
          );
        }
      }
    }
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (endDateStr < todayStr) {
    throw new Error(
      "Inconsistencia de fecha: La fecha límite proyectada para el objetivo no puede ser anterior a la fecha actual."
    );
  }

  if (endDateStr < startDateStr) {
    throw new Error(
      "Inconsistencia de fecha: La fecha límite debe ser posterior o igual a la fecha de inicio del objetivo."
    );
  }

  const startDate = new Date(`${startDateStr}T00:00:00`);
  const endDate = new Date(`${endDateStr}T23:59:59`);
  const totalTasks = tasksList.length;

  const goal = await prisma.goal.create({
    data: {
      title,
      description,
      scope,
      horizon,
      period,
      startDate,
      endDate,
      indicator,
      targetValue: totalTasks,
      currentValue: 0,
      unit: "avances",
      status,
      areaId: areaId || undefined,
      responsibleId,
      createdById: userId,
      tasks: {
        create: tasksList.map((t) => ({
          title: t.title.trim(),
          assignedToId: t.assignedToId || null,
          status: "pendiente",
        })),
      },
      progressUpdates: {
        create: [
          {
            userId,
            previousValue: 0,
            newValue: 0,
            note: `Objetivo definido con ${totalTasks} avance(s) inicial(es) para alcanzar el 100% de cumplimiento.`,
          },
        ],
      },
    },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
  return goal;
}

export async function updateGoal(formData: FormData) {
  const { userId, isGerencia, userAreaIds } = await checkGoalsAccess();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID de objetivo requerido.");

  const goal = await prisma.goal.findUnique({
    where: { id },
  });

  if (!goal) throw new Error("Objetivo no encontrado.");

  if (!isGerencia) {
    if (goal.areaId && !userAreaIds.includes(goal.areaId) && goal.responsibleId !== userId) {
      throw new Error("No está autorizado a modificar objetivos de otras áreas.");
    }
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  let scope = (formData.get("scope") as string)?.trim() || "Área";
  const horizon = (formData.get("horizon") as string)?.trim() || "Corto Plazo";
  const period = (formData.get("period") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim();
  const indicator = (formData.get("indicator") as string)?.trim() || "Avances y Cumplimiento Operativo";
  let areaId = (formData.get("areaId") as string)?.trim() || null;
  const responsibleId = (formData.get("responsibleId") as string)?.trim() || userId;
  const status = (formData.get("status") as string)?.trim() || "En Curso";

  if (!title || !period || !startDateStr || !endDateStr) {
    throw new Error("Por favor complete los campos obligatorios del objetivo.");
  }

  if (!isGerencia) {
    scope = "Área";
    if (areaId && !userAreaIds.includes(areaId)) {
      throw new Error("No está autorizado a modificar objetivos de otras áreas.");
    }
  }

  if (scope === "Gerencial") {
    if (!isGerencia) {
      throw new Error("Solo la Gerencia General puede gestionar objetivos de alcance gerencial transversal.");
    }
    areaId = null;
  }

  if (endDateStr < startDateStr) {
    throw new Error(
      "Inconsistencia de fecha: La fecha límite debe ser posterior o igual a la fecha de inicio del objetivo."
    );
  }

  const startDate = new Date(`${startDateStr}T00:00:00`);
  const endDate = new Date(`${endDateStr}T23:59:59`);

  await prisma.goal.update({
    where: { id },
    data: {
      title,
      description,
      scope,
      horizon,
      period,
      startDate,
      endDate,
      indicator,
      status,
      areaId: areaId || null,
      responsibleId,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function createGoalTask(formData: FormData) {
  const { userId, isGerencia, userAreaIds } = await checkGoalsAccess();

  const goalId = String(formData.get("goalId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;

  if (!goalId || !title) {
    throw new Error("El título del avance no puede estar vacío.");
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { tasks: true },
  });

  if (!goal) {
    throw new Error("Objetivo no encontrado.");
  }

  // Segregación de área
  if (!isGerencia) {
    if (goal.areaId && !userAreaIds.includes(goal.areaId) && goal.responsibleId !== userId) {
      throw new Error("No está autorizado a agregar avances a objetivos de otras áreas.");
    }
  }

  // Validar que el operador asignado pertenezca al área del objetivo
  if (assignedToId && goal.areaId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      include: { areas: true },
    });
    if (!assignedUser?.areas.some((ua) => ua.areaId === goal.areaId)) {
      throw new Error("El operador seleccionado no pertenece al área de este objetivo.");
    }
  }

  await prisma.goalTask.create({
    data: {
      goalId,
      title,
      status: "pendiente",
      assignedToId,
    },
  });

  // Reconsiderar total de avances y recalcular avance hacia el 100%
  const allTasks = await prisma.goalTask.findMany({
    where: { goalId },
  });

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completada").length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previousValue = goal.currentValue;

  let newStatus = goal.status;
  if (totalTasks > 0 && completedTasks === totalTasks) {
    newStatus = "Cumplido";
  } else if (newStatus === "Cumplido" && completedTasks < totalTasks) {
    newStatus = "En Curso";
  }

  await prisma.$transaction([
    prisma.goal.update({
      where: { id: goalId },
      data: {
        targetValue: totalTasks,
        currentValue: completedTasks,
        unit: "avances",
        status: newStatus,
      },
    }),
    prisma.goalProgressUpdate.create({
      data: {
        goalId,
        userId,
        previousValue,
        newValue: completedTasks,
        note: `Se agregó el avance: "${title}". Total reconsiderado: ${totalTasks} avances (${completedTasks}/${totalTasks} cumplidos - ${percent}%)`,
      },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function updateGoalTaskStatus(formData: FormData) {
  const authUser = await getAuthenticatedUser();
  const userId = authUser.userId;

  const taskId = String(formData.get("taskId") ?? "").trim();
  const goalId = String(formData.get("goalId") ?? "").trim();
  const newStatus = String(formData.get("newStatus") ?? "").trim(); // "completada" | "pendiente"

  if (!taskId || !goalId || !newStatus) {
    throw new Error("Datos incompletos para actualizar el estado del avance.");
  }

  const task = await prisma.goalTask.findUnique({
    where: { id: taskId },
    include: {
      goal: true,
    },
  });

  if (!task || task.goalId !== goalId) {
    throw new Error("Avance de objetivo no encontrado.");
  }

  const isAssigned = task.assignedToId === userId;
  const isGoalResponsible = task.goal.responsibleId === userId;
  const isAreaDirector = task.goal.areaId ? authUser.userAreaIds.includes(task.goal.areaId) : false;

  if (
    !authUser.isGerencia &&
    !isAssigned &&
    !isGoalResponsible &&
    !isAreaDirector
  ) {
    throw new Error("No tiene permisos para modificar el estado de avances de otras áreas.");
  }

  const now = new Date();
  const isCompleted = newStatus === "completada";

  await prisma.goalTask.update({
    where: { id: taskId },
    data: {
      status: isCompleted ? "completada" : "pendiente",
      completedAt: isCompleted ? now : null,
      startedAt: isCompleted ? (task.startedAt || now) : null,
    },
  });

  // Recalcular avances hacia el 100%
  const allTasks = await prisma.goalTask.findMany({
    where: { goalId },
  });

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completada").length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previousValue = task.goal.currentValue;

  let newStatusGoal = task.goal.status;
  if (totalTasks > 0 && completedTasks === totalTasks) {
    newStatusGoal = "Cumplido";
  } else if (newStatusGoal === "Cumplido" && completedTasks < totalTasks) {
    newStatusGoal = "En Curso";
  }

  const actionText = isCompleted
    ? `Avance "${task.title}" marcado como cumplido (${completedTasks}/${totalTasks} cumplidos - ${percent}%)`
    : `Avance "${task.title}" reabierto (${completedTasks}/${totalTasks} cumplidos - ${percent}%)`;

  await prisma.$transaction([
    prisma.goal.update({
      where: { id: goalId },
      data: {
        targetValue: totalTasks,
        currentValue: completedTasks,
        unit: "avances",
        status: newStatusGoal,
      },
    }),
    prisma.goalProgressUpdate.create({
      data: {
        goalId,
        userId,
        previousValue,
        newValue: completedTasks,
        note: actionText,
      },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function deleteGoalTask(formData: FormData) {
  const { userId, isGerencia, userAreaIds } = await checkGoalsAccess();

  const taskId = String(formData.get("taskId") ?? "").trim();
  const goalId = String(formData.get("goalId") ?? "").trim();

  if (!taskId || !goalId) {
    throw new Error("Datos incompletos para eliminar el avance.");
  }

  const task = await prisma.goalTask.findUnique({
    where: { id: taskId },
    include: { goal: true },
  });

  if (!task || task.goalId !== goalId) {
    throw new Error("Avance no encontrado.");
  }

  if (!isGerencia) {
    if (task.goal.areaId && !userAreaIds.includes(task.goal.areaId) && task.goal.responsibleId !== userId) {
      throw new Error("No está autorizado a eliminar avances de este objetivo.");
    }
  }

  await prisma.goalTask.delete({
    where: { id: taskId },
  });

  // Reconsiderar total y recalcular avances
  const allTasks = await prisma.goalTask.findMany({
    where: { goalId },
  });

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completada").length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previousValue = task.goal.currentValue;

  let newStatusGoal = task.goal.status;
  if (totalTasks > 0 && completedTasks === totalTasks) {
    newStatusGoal = "Cumplido";
  } else if (newStatusGoal === "Cumplido" && completedTasks < totalTasks) {
    newStatusGoal = "En Curso";
  }

  await prisma.$transaction([
    prisma.goal.update({
      where: { id: goalId },
      data: {
        targetValue: totalTasks,
        currentValue: completedTasks,
        unit: "avances",
        status: newStatusGoal,
      },
    }),
    prisma.goalProgressUpdate.create({
      data: {
        goalId,
        userId,
        previousValue,
        newValue: completedTasks,
        note: `Se eliminó el avance: "${task.title}". Total reconsiderado: ${totalTasks} avances (${completedTasks}/${totalTasks} cumplidos - ${percent}%)`,
      },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function deleteGoal(id: string) {
  const { isGerencia, userAreaIds, userId } = await checkGoalsAccess();

  const goal = await prisma.goal.findUnique({
    where: { id },
  });

  if (!goal) throw new Error("Objetivo no encontrado.");

  if (!isGerencia) {
    if (goal.areaId && !userAreaIds.includes(goal.areaId) && goal.responsibleId !== userId) {
      throw new Error("No está autorizado a eliminar objetivos de otras áreas.");
    }
  }

  await prisma.goal.delete({
    where: { id },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
}
