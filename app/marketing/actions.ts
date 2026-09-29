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
    throw new Error("Acceso no autorizado para gestionar campañas de Marketing.");
  }

  return { userId: session.user.id, isGeneralAdmin, isMarketingMember };
}

export async function createMarketingCampaign(formData: FormData) {
  const { userId } = await checkMarketingAccess();

  const name = (formData.get("name") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim();
  const projectName = (formData.get("projectName") as string)?.trim() || null;
  const objective = (formData.get("objective") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Planificación";
  const budget = parseFloat(formData.get("budget") as string) || 0;
  const spent = parseFloat(formData.get("spent") as string) || 0;
  const targetAudience = (formData.get("targetAudience") as string)?.trim() || null;
  const channels = (formData.get("channels") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const expectedKpis = (formData.get("expectedKpis") as string)?.trim() || null;
  const assignedToId = (formData.get("assignedToId") as string)?.trim() || null;

  if (!name || !brand || !objective || !startDateStr || !channels) {
    throw new Error("Nombre, Marca, Objetivo, Fecha de Inicio y Canales son obligatorios.");
  }

  // Generate unique code CMP-YYYY-XXX
  const year = new Date(startDateStr).getFullYear() || new Date().getFullYear();
  const count = await prisma.marketingCampaign.count();
  const nextNum = String(count + 1).padStart(3, "0");
  const code = `CMP-${year}-${nextNum}`;

  const campaign = await prisma.marketingCampaign.create({
    data: {
      code,
      name,
      brand,
      projectName,
      objective,
      startDate: new Date(startDateStr),
      endDate: endDateStr ? new Date(endDateStr) : null,
      status,
      budget,
      spent,
      targetAudience,
      channels,
      description,
      expectedKpis,
      createdById: userId,
      assignedToId: assignedToId || userId,
    },
  });

  revalidatePath("/marketing");
  return campaign;
}

export async function updateMarketingCampaign(id: string, formData: FormData) {
  await checkMarketingAccess();

  const name = (formData.get("name") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim();
  const projectName = (formData.get("projectName") as string)?.trim() || null;
  const objective = (formData.get("objective") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const endDateStr = (formData.get("endDate") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim();
  const budget = parseFloat(formData.get("budget") as string) || 0;
  const spent = parseFloat(formData.get("spent") as string) || 0;
  const targetAudience = (formData.get("targetAudience") as string)?.trim() || null;
  const channels = (formData.get("channels") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const expectedKpis = (formData.get("expectedKpis") as string)?.trim() || null;
  const assignedToId = (formData.get("assignedToId") as string)?.trim() || null;

  if (!name || !brand || !objective || !startDateStr || !channels) {
    throw new Error("Nombre, Marca, Objetivo, Fecha de Inicio y Canales son obligatorios.");
  }

  const campaign = await prisma.marketingCampaign.update({
    where: { id },
    data: {
      name,
      brand,
      projectName,
      objective,
      startDate: new Date(startDateStr),
      endDate: endDateStr ? new Date(endDateStr) : null,
      status,
      budget,
      spent,
      targetAudience,
      channels,
      description,
      expectedKpis,
      assignedToId,
    },
  });

  revalidatePath("/marketing");
  return campaign;
}

export async function updateCampaignStatus(id: string, newStatus: string) {
  await checkMarketingAccess();

  const campaign = await prisma.marketingCampaign.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath("/marketing");
  return campaign;
}

export async function deleteMarketingCampaign(id: string) {
  await checkMarketingAccess();

  await prisma.marketingCampaign.delete({
    where: { id },
  });

  revalidatePath("/marketing");
  return { success: true };
}
