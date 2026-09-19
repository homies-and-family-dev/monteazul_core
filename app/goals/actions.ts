"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function checkGoalsAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { include: { role: true } },
      areas: { include: { area: true } },
    },
  });

  const isGeneralAdmin =
    currentUser?.roles.some(
      (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
    ) ?? false;

  const isAreaDirector =
    currentUser?.roles.some((r) => r.role.name === "Director de Área") ?? false;

  if (!isGeneralAdmin && !isAreaDirector) {
    throw new Error("Acceso no autorizado al módulo de Objetivos.");
  }

  return { userId: session.user.id, isGeneralAdmin, isAreaDirector, currentUser };
}

export async function createGoal(formData: FormData) {
  const { userId, isGeneralAdmin, currentUser } = await checkGoalsAccess();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const scope = (formData.get("scope") as string)?.trim() || "Área";
  const horizon = (formData.get("horizon") as string)?.trim() || "Corto Plazo";
  const period = (formData.get("period") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim();
  const indicator = (formData.get("indicator") as string)?.trim();
  const targetValue = parseFloat(formData.get("targetValue") as string);
  const currentValue = parseFloat((formData.get("currentValue") as string) || "0");
  const unit = (formData.get("unit") as string)?.trim() || "%";
  let areaId = (formData.get("areaId") as string)?.trim() || null;
  const responsibleId = (formData.get("responsibleId") as string)?.trim() || userId;

  if (!title || !period || !startDateStr || !endDateStr || !indicator || isNaN(targetValue)) {
    throw new Error("Por favor complete los campos obligatorios del objetivo.");
  }

  // Si no es Administrador General, limitar el área a las que dirige
  if (!isGeneralAdmin) {
    const directorAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];
    if (areaId && !directorAreaIds.includes(areaId)) {
      throw new Error("Solo puede crear objetivos para el área que dirige.");
    }
  }

  if (scope === "Gerencial") {
    areaId = null;
  }

  const startDate = new Date(`${startDateStr}T00:00:00`);
  const endDate = new Date(`${endDateStr}T23:59:59`);

  let status = "En Curso";
  if (currentValue >= targetValue) {
    status = "Cumplido";
  }

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
      targetValue,
      currentValue,
      unit,
      status,
      areaId: areaId || undefined,
      responsibleId,
      createdById: userId,
      progressUpdates:
        currentValue > 0
          ? {
              create: [
                {
                  userId,
                  previousValue: 0,
                  newValue: currentValue,
                  note: "Valor base inicial registrado en la creación del objetivo.",
                },
              ],
            }
          : undefined,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
  return goal;
}

export async function updateGoal(formData: FormData) {
  const { userId, isGeneralAdmin, currentUser } = await checkGoalsAccess();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID de objetivo requerido.");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const scope = (formData.get("scope") as string)?.trim() || "Área";
  const horizon = (formData.get("horizon") as string)?.trim() || "Corto Plazo";
  const period = (formData.get("period") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim();
  const indicator = (formData.get("indicator") as string)?.trim();
  const targetValue = parseFloat(formData.get("targetValue") as string);
  const unit = (formData.get("unit") as string)?.trim() || "%";
  let areaId = (formData.get("areaId") as string)?.trim() || null;
  const responsibleId = (formData.get("responsibleId") as string)?.trim() || userId;
  const status = (formData.get("status") as string)?.trim() || "En Curso";

  if (!title || !period || !startDateStr || !endDateStr || !indicator || isNaN(targetValue)) {
    throw new Error("Por favor complete los campos obligatorios del objetivo.");
  }

  if (!isGeneralAdmin) {
    const directorAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];
    if (areaId && !directorAreaIds.includes(areaId)) {
      throw new Error("No está autorizado a modificar objetivos de otras áreas.");
    }
  }

  if (scope === "Gerencial") {
    areaId = null;
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
      targetValue,
      unit,
      status,
      areaId: areaId || null,
      responsibleId,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function recordGoalProgress(formData: FormData) {
  const { userId } = await checkGoalsAccess();

  const goalId = formData.get("goalId") as string;
  const newValue = parseFloat(formData.get("newValue") as string);
  const note = (formData.get("note") as string)?.trim();

  if (!goalId || isNaN(newValue) || !note) {
    throw new Error("Debe ingresar el nuevo valor alcanzado y la justificación del avance.");
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal) throw new Error("Objetivo no encontrado.");

  const previousValue = goal.currentValue;

  let newStatus = goal.status;
  if (newValue >= goal.targetValue) {
    newStatus = "Cumplido";
  } else if (newStatus === "Cumplido" && newValue < goal.targetValue) {
    newStatus = "En Curso";
  }

  await prisma.$transaction([
    prisma.goalProgressUpdate.create({
      data: {
        goalId,
        userId,
        previousValue,
        newValue,
        note,
      },
    }),
    prisma.goal.update({
      where: { id: goalId },
      data: {
        currentValue: newValue,
        status: newStatus,
      },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/management");
}

export async function deleteGoal(id: string) {
  const { isGeneralAdmin, currentUser } = await checkGoalsAccess();

  const goal = await prisma.goal.findUnique({
    where: { id },
  });

  if (!goal) throw new Error("Objetivo no encontrado.");

  if (!isGeneralAdmin) {
    const directorAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];
    if (goal.areaId && !directorAreaIds.includes(goal.areaId)) {
      throw new Error("No está autorizado a eliminar objetivos de otras áreas.");
    }
  }

  await prisma.goal.delete({
    where: { id },
  });

  revalidatePath("/goals");
  revalidatePath("/management");
}
