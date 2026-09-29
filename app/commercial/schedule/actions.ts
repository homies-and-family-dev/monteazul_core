"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { findOrCreateCommercialClient } from "@/lib/commercial-clients";

export async function createCommercialBooking(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const project = String(formData.get("project") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const numAttendees = parseInt(String(formData.get("numAttendees") ?? "1"), 10) || 1;
  const dateStr = String(formData.get("date") ?? "").trim(); // YYYY-MM-DD
  const timeSlot = String(formData.get("timeSlot") ?? "09:00").trim(); // HH:MM
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const transportNeed = formData.get("transportNeed") === "true" || formData.get("transportNeed") === "on";
  const assignedAdvisorId = String(formData.get("assignedAdvisorId") ?? "").trim() || null;

  if (!project || !clientName || !clientPhone || !dateStr) {
    throw new Error("El proyecto, nombre del cliente, teléfono y fecha son obligatorios.");
  }

  // Combinar fecha y hora
  const bookingDate = new Date(`${dateStr}T${timeSlot}:00`);
  if (isNaN(bookingDate.getTime())) {
    throw new Error("Fecha u hora inválida.");
  }

  // Buscar o crear cliente en el directorio unificado para trazabilidad
  const unifiedClient = await findOrCreateCommercialClient({
    name: clientName,
    phone: clientPhone,
    email: clientEmail || null,
    advisorId: assignedAdvisorId,
    createdById: session.user.id,
  });

  const booking = await prisma.commercialBooking.create({
    data: {
      project,
      clientName,
      clientEmail,
      clientPhone,
      numAttendees,
      date: bookingDate,
      durationMinutes: 90,
      status: "AGENDADA",
      notes,
      transportNeed,
      assignedAdvisorId,
      clientId: unifiedClient.id,
      createdById: session.user.id,
    },
  });

  revalidatePath("/commercial/schedule");
  revalidatePath("/commercial/clients");
  revalidatePath("/commercial");
  return { success: true, bookingId: booking.id };
}

export async function updateCommercialBookingStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const newStatus = String(formData.get("status") ?? "").trim();
  const feedbackNotes = String(formData.get("feedbackNotes") ?? "").trim();

  if (!id || !newStatus) {
    throw new Error("ID de agendamiento y estado son obligatorios.");
  }

  await prisma.commercialBooking.update({
    where: { id },
    data: {
      status: newStatus,
      ...(feedbackNotes ? { feedbackNotes } : {}),
    },
  });

  revalidatePath("/commercial/schedule");
  return { success: true };
}

export async function updateCommercialBooking(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const project = String(formData.get("project") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const numAttendees = parseInt(String(formData.get("numAttendees") ?? "1"), 10) || 1;
  const dateStr = String(formData.get("date") ?? "").trim();
  const timeSlot = String(formData.get("timeSlot") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const feedbackNotes = String(formData.get("feedbackNotes") ?? "").trim() || null;
  const transportNeed = formData.get("transportNeed") === "true" || formData.get("transportNeed") === "on";
  const assignedAdvisorId = String(formData.get("assignedAdvisorId") ?? "").trim() || null;

  if (!id) {
    throw new Error("ID de agendamiento requerido.");
  }

  const dataToUpdate: any = {};
  if (project) dataToUpdate.project = project;
  if (clientName) dataToUpdate.clientName = clientName;
  if (clientEmail !== undefined) dataToUpdate.clientEmail = clientEmail;
  if (clientPhone) dataToUpdate.clientPhone = clientPhone;
  if (numAttendees) dataToUpdate.numAttendees = numAttendees;
  if (status) dataToUpdate.status = status;
  if (notes !== undefined) dataToUpdate.notes = notes;
  if (feedbackNotes !== undefined) dataToUpdate.feedbackNotes = feedbackNotes;
  dataToUpdate.transportNeed = transportNeed;
  dataToUpdate.assignedAdvisorId = assignedAdvisorId;

  if (dateStr && timeSlot) {
    const newDate = new Date(`${dateStr}T${timeSlot}:00`);
    if (!isNaN(newDate.getTime())) {
      dataToUpdate.date = newDate;
    }
  }

  await prisma.commercialBooking.update({
    where: { id },
    data: dataToUpdate,
  });

  revalidatePath("/commercial/schedule");
  return { success: true };
}

export async function deleteCommercialBooking(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado.");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("ID de agendamiento requerido.");
  }

  await prisma.commercialBooking.delete({
    where: { id },
  });

  revalidatePath("/commercial/schedule");
  return { success: true };
}
