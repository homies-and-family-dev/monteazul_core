"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function checkMarketingAccess() {
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

  const isMarketingMember =
    currentUser?.areas.some((a) => a.area.name === "Marketing") ?? false;

  if (!isGeneralAdmin && !isMarketingMember) {
    throw new Error("Acceso no autorizado al módulo funcional de Marketing.");
  }

  return { userId: session.user.id, isGeneralAdmin, isMarketingMember };
}

export async function createMarketingContent(formData: FormData) {
  const { userId } = await checkMarketingAccess();

  const brand = (formData.get("brand") as string)?.trim();
  const dateStr = (formData.get("date") as string)?.trim();
  const timeStr = (formData.get("time") as string)?.trim() || "09:00";
  const title = (formData.get("title") as string)?.trim();
  const format = (formData.get("format") as string)?.trim();
  const objective = (formData.get("objective") as string)?.trim();
  const platforms = (formData.get("platforms") as string)?.trim();
  const copy = (formData.get("copy") as string)?.trim() || null;
  const fileUrl = (formData.get("fileUrl") as string)?.trim() || null;
  const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Borrador";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const assignedToId = (formData.get("assignedToId") as string)?.trim() || null;
  const requestId = (formData.get("requestId") as string)?.trim() || null;

  if (!brand || !dateStr || !title || !format || !objective || !platforms) {
    throw new Error("Los campos Marca, Fecha, Tema, Formato, Objetivo y Plataformas son obligatorios.");
  }

  // Combinar fecha y hora
  const scheduledDate = new Date(`${dateStr}T${timeStr}:00`);

  // Regla institucional Cero Papel / Calidad: No permitir programar contenidos en el pasado
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (scheduledDate < fiveMinutesAgo) {
    throw new Error(
      "Inconsistencia de fecha: No se permite programar publicaciones o contenidos con fechas u horas en el pasado."
    );
  }

  await prisma.marketingContent.create({
    data: {
      brand,
      date: scheduledDate,
      title,
      format,
      objective,
      platforms,
      copy,
      fileUrl,
      thumbnailUrl,
      status,
      notes,
      createdById: userId,
      assignedToId: assignedToId || undefined,
      requestId: requestId || undefined,
    },
  });

  revalidatePath("/marketing/calendar");
}

export async function updateMarketingContent(formData: FormData) {
  await checkMarketingAccess();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID de contenido requerido.");

  const brand = (formData.get("brand") as string)?.trim();
  const dateStr = (formData.get("date") as string)?.trim();
  const timeStr = (formData.get("time") as string)?.trim() || "09:00";
  const title = (formData.get("title") as string)?.trim();
  const format = (formData.get("format") as string)?.trim();
  const objective = (formData.get("objective") as string)?.trim();
  const platforms = (formData.get("platforms") as string)?.trim();
  const copy = (formData.get("copy") as string)?.trim() || null;
  const fileUrl = (formData.get("fileUrl") as string)?.trim() || null;
  const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Borrador";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const assignedToId = (formData.get("assignedToId") as string)?.trim() || null;
  const requestId = (formData.get("requestId") as string)?.trim() || null;

  if (!brand || !dateStr || !title || !format || !objective || !platforms) {
    throw new Error("Los campos Marca, Fecha, Tema, Formato, Objetivo y Plataformas son obligatorios.");
  }

  const scheduledDate = new Date(`${dateStr}T${timeStr}:00`);

  await prisma.marketingContent.update({
    where: { id },
    data: {
      brand,
      date: scheduledDate,
      title,
      format,
      objective,
      platforms,
      copy,
      fileUrl,
      thumbnailUrl,
      status,
      notes,
      assignedToId: assignedToId || null,
      requestId: requestId || null,
    },
  });

  revalidatePath("/marketing/calendar");
}

export async function updateMarketingContentStatus(contentId: string, newStatus: string) {
  await checkMarketingAccess();

  await prisma.marketingContent.update({
    where: { id: contentId },
    data: { status: newStatus },
  });

  revalidatePath("/marketing/calendar");
}

export async function deleteMarketingContent(contentId: string) {
  await checkMarketingAccess();

  await prisma.marketingContent.delete({
    where: { id: contentId },
  });

  revalidatePath("/marketing/calendar");
}
