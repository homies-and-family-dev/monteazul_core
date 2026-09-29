"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ClientFormData {
  name: string;
  docType?: string;
  docNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  civilStatus?: string;
  bank?: string;
  occupation?: string;
  notes?: string;
  assignedAdvisorId?: string;
}

export async function createCommercialClientAction(data: ClientFormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado." };
  }

  try {
    const cleanDoc = data.docNumber?.trim() || null;
    const cleanPhone = data.phone.trim();
    const cleanEmail = data.email?.trim().toLowerCase() || null;

    if (!data.name.trim() || !cleanPhone) {
      return { success: false, error: "El nombre y el teléfono son obligatorios." };
    }

    // Verificar si ya existe por documento
    if (cleanDoc) {
      const existing = await prisma.commercialClient.findUnique({
        where: { docNumber: cleanDoc },
      });
      if (existing) {
        return {
          success: false,
          error: `Ya existe un cliente registrado con el documento ${cleanDoc} (${existing.name}).`,
        };
      }
    }

    const client = await prisma.commercialClient.create({
      data: {
        name: data.name.trim(),
        docType: data.docType || "CC",
        docNumber: cleanDoc,
        phone: cleanPhone,
        email: cleanEmail,
        address: data.address?.trim() || null,
        city: data.city?.trim() || "Colombia",
        civilStatus: data.civilStatus?.trim() || null,
        bank: data.bank?.trim() || null,
        occupation: data.occupation?.trim() || null,
        notes: data.notes?.trim() || null,
        assignedAdvisorId: data.assignedAdvisorId || session.user.id,
        createdById: session.user.id,
      },
    });

    revalidatePath("/commercial/clients");
    revalidatePath("/commercial");
    return { success: true, clientId: client.id };
  } catch (error: any) {
    console.error("Error creating commercial client:", error);
    return { success: false, error: error.message || "Error al crear el cliente." };
  }
}

export async function updateCommercialClientAction(clientId: string, data: ClientFormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado." };
  }

  try {
    const cleanDoc = data.docNumber?.trim() || null;
    const cleanPhone = data.phone.trim();
    const cleanEmail = data.email?.trim().toLowerCase() || null;

    if (!data.name.trim() || !cleanPhone) {
      return { success: false, error: "El nombre y el teléfono son obligatorios." };
    }

    // Si cambió el documento, verificar que no colisione con otro
    if (cleanDoc) {
      const existing = await prisma.commercialClient.findFirst({
        where: { docNumber: cleanDoc, id: { not: clientId } },
      });
      if (existing) {
        return {
          success: false,
          error: `Ya existe otro cliente con el documento ${cleanDoc} (${existing.name}).`,
        };
      }
    }

    await prisma.commercialClient.update({
      where: { id: clientId },
      data: {
        name: data.name.trim(),
        docType: data.docType || "CC",
        docNumber: cleanDoc,
        phone: cleanPhone,
        email: cleanEmail,
        address: data.address?.trim() || null,
        city: data.city?.trim() || "Colombia",
        civilStatus: data.civilStatus?.trim() || null,
        bank: data.bank?.trim() || null,
        occupation: data.occupation?.trim() || null,
        notes: data.notes?.trim() || null,
        assignedAdvisorId: data.assignedAdvisorId || null,
      },
    });

    revalidatePath("/commercial/clients");
    revalidatePath(`/commercial/clients/${clientId}`);
    revalidatePath("/commercial");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating commercial client:", error);
    return { success: false, error: error.message || "Error al actualizar los datos del cliente." };
  }
}
