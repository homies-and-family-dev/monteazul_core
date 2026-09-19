"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";

export async function createRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const originAreaId = String(formData.get("originAreaId") ?? "").trim();
  const destinationAreaId = String(formData.get("destinationAreaId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const priority = String(formData.get("priority") ?? "Media").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDateRaw = formData.get("dueDate");
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const externalUrlName = String(formData.get("externalUrlName") ?? "").trim();

  if (!originAreaId || !destinationAreaId || !type || !title || !description) {
    throw new Error("Área de origen, área de destino, tipo, título y descripción son obligatorios.");
  }

  const destinationArea = await prisma.area.findUniqueOrThrow({
    where: { id: destinationAreaId },
  });

  const count = await prisma.request.count({ where: { destinationAreaId } });
  const ticketNumber = `${destinationArea.code}-${String(count + 1).padStart(6, "0")}`;

  let dueDate: Date | null = null;
  if (dueDateRaw) {
    const dueDateStr = String(dueDateRaw).trim();
    if (dueDateStr) {
      // Regla de Calidad: La fecha requerida proyectada no puede ser anterior a la fecha actual
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (dueDateStr < todayStr) {
        throw new Error(
          "Inconsistencia de fecha: La fecha requerida de entrega no puede ser anterior a la fecha actual."
        );
      }
      dueDate = new Date(`${dueDateStr}T23:59:59`);
    }
  }

  const newRequest = await prisma.request.create({
    data: {
      ticketNumber,
      filedById: session.user.id,
      originAreaId,
      destinationAreaId,
      type,
      priority,
      title,
      description,
      dueDate,
      status: "FILED",
      // Entrada inicial del historial de trazabilidad
      statusHistory: {
        create: {
          newStatus: "FILED",
          userId: session.user.id,
          note: "Radicación inicial de la solicitud",
        },
      },
      // Enlace a repositorio o nube si fue suministrado
      ...(externalUrl
        ? {
            files: {
              create: {
                type: "link",
                name: externalUrlName || "Repositorio / Enlace externo inicial",
                url: externalUrl,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/requests");
  redirect(`/requests/${newRequest.id}`);
}

export async function updateRequestStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const newStatus = String(formData.get("newStatus") ?? "").trim() as RequestStatus;
  const note = String(formData.get("note") ?? "").trim() || null;
  const assigneeId = String(formData.get("assigneeId") ?? "").trim();
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const externalUrlName = String(formData.get("externalUrlName") ?? "").trim();

  if (!requestId || !newStatus) {
    throw new Error("Datos incompletos para actualizar el estado.");
  }

  const currentRequest = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
  });

  // Validación de regla de negocio: no permitir entrega si hay subtareas sin completar
  if (newStatus === "DELIVERED") {
    const pendingTasksCount = await prisma.task.count({
      where: {
        requestId,
        status: { not: "completada" },
      },
    });

    if (pendingTasksCount > 0) {
      throw new Error(
        `No es posible entregar la solicitud: existen ${pendingTasksCount} subtarea(s) pendiente(s) por completar.`
      );
    }
  }

  // Actualizar solicitud y crear registro en el historial para auditoría y medición de tiempos
  await prisma.$transaction(async (tx) => {
    // Si se asigna un operador en la transición
    if (assigneeId) {
      await tx.assignment.create({
        data: {
          requestId,
          userId: assigneeId,
          assignedById: session.user!.id!,
        },
      });
    }

    // Registrar enlace si se aportó durante la entrega o revisión
    if (externalUrl) {
      await tx.file.create({
        data: {
          requestId,
          type: "link",
          name: externalUrlName || `Enlace asociado a estado: ${newStatus}`,
          url: externalUrl,
        },
      });
    }

    // Registrar historial de estados
    await tx.statusHistory.create({
      data: {
        requestId,
        previousStatus: currentRequest.status,
        newStatus,
        userId: session.user!.id!,
        note,
      },
    });

    // Actualizar estado actual de la solicitud
    await tx.request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
      },
    });
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}

export async function addComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const externalUrlName = String(formData.get("externalUrlName") ?? "").trim();

  if (!requestId || !content) {
    throw new Error("El contenido del mensaje no puede estar vacío.");
  }

  await prisma.comment.create({
    data: {
      requestId,
      userId: session.user.id,
      content,
      ...(externalUrl
        ? {
            files: {
              create: {
                type: "link",
                name: externalUrlName || "Enlace en comentario",
                url: externalUrl,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath(`/requests/${requestId}`);
}

const FINISHED_STATUSES: RequestStatus[] = ["CLOSED", "DELIVERED", "PENDING_CONFIRMATION"];

export async function createTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;

  if (!requestId || !title) {
    throw new Error("El título de la tarea no puede estar vacío.");
  }

  const request = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
    select: { status: true },
  });

  if (FINISHED_STATUSES.includes(request.status)) {
    throw new Error(
      "No es posible agregar nuevas subtareas: la solicitud general ya ha finalizado o se encuentra cerrada."
    );
  }

  await prisma.task.create({
    data: {
      requestId,
      title,
      status: "pendiente",
      assignedToId,
    },
  });

  revalidatePath(`/requests/${requestId}`);
}

export async function updateTaskStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const newStatus = String(formData.get("newStatus") ?? "").trim();

  if (!taskId || !newStatus) {
    throw new Error("Datos incompletos para actualizar la tarea.");
  }

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      request: {
        select: { id: true, status: true },
      },
    },
  });

  if (FINISHED_STATUSES.includes(task.request.status)) {
    throw new Error(
      "No es posible reabrir o modificar subtareas: la solicitud general ya ha finalizado o se encuentra cerrada."
    );
  }

  // Regla de negocio: no se permite iniciar subtareas sin haber iniciado la atención de la solicitud general
  if (newStatus === "en_proceso" && task.request.status !== "IN_PROGRESS") {
    throw new Error(
      "No es posible iniciar la tarea: debe iniciar la atención de la solicitud general antes de comenzar a ejecutar sus subtareas."
    );
  }

  const now = new Date();
  let completedAt: Date | null = task.completedAt;
  let startedAt: Date | null = task.startedAt;
  let durationMs: number = task.durationMs || 0;

  if (newStatus === "en_proceso") {
    // Inicia o reanuda la ejecución de la tarea
    startedAt = now;
    completedAt = null;
  } else if (newStatus === "completada") {
    // Finaliza la tarea y suma el tiempo de este ciclo al acumulado total
    const start = task.startedAt
      ? new Date(task.startedAt).getTime()
      : new Date(task.createdAt).getTime();
    const cycleMs = Math.max(0, now.getTime() - start);
    durationMs += cycleMs;
    completedAt = now;
    startedAt = null;
  } else if (newStatus === "pendiente") {
    startedAt = null;
    completedAt = null;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      startedAt,
      completedAt,
      durationMs,
    },
  });

  revalidatePath(`/requests/${requestId || task.request.id}`);
}

export async function deleteTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!taskId) {
    throw new Error("ID de tarea no proporcionado.");
  }

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      request: {
        select: { id: true, status: true },
      },
    },
  });

  if (FINISHED_STATUSES.includes(task.request.status)) {
    throw new Error(
      "No es posible eliminar subtareas: la solicitud general ya ha finalizado o se encuentra cerrada."
    );
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath(`/requests/${requestId || task.request.id}`);
}
