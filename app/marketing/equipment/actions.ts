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
    throw new Error("Acceso restringido al módulo de equipos de Marketing.");
  }

  return { userId: session.user.id, isGeneralAdmin, isMarketingMember, currentUser };
}

// ------------------------------------------------------------
// GESTIÓN DEL INVENTARIO DE EQUIPOS
// ------------------------------------------------------------

export async function createEquipment(formData: FormData) {
  await checkMarketingAccess();

  let code = (formData.get("code") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim();
  const model = (formData.get("model") as string)?.trim() || null;
  const serialNumber = (formData.get("serialNumber") as string)?.trim() || null;
  const physicalCondition = (formData.get("physicalCondition") as string)?.trim() || "Excelente";
  const location = (formData.get("location") as string)?.trim() || null;
  const accessories = (formData.get("accessories") as string)?.trim() || null;
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name || !category || !brand) {
    throw new Error("Nombre, Categoría y Marca son campos obligatorios.");
  }

  // Generar código automático si no se ingresó
  if (!code) {
    const count = await prisma.equipment.count();
    code = `EQ-MKT-${String(count + 1).padStart(3, "0")}`;
  }

  // Verificar código único
  const existing = await prisma.equipment.findUnique({
    where: { code },
  });
  if (existing) {
    throw new Error(`El código de inventario ${code} ya está registrado.`);
  }

  await prisma.equipment.create({
    data: {
      code,
      name,
      category,
      brand,
      model,
      serialNumber,
      status: "Disponible",
      physicalCondition,
      location,
      accessories,
      photoUrl,
      notes,
    },
  });

  revalidatePath("/marketing/equipment");
}

export async function updateEquipment(formData: FormData) {
  await checkMarketingAccess();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID de equipo requerido.");

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const brand = (formData.get("brand") as string)?.trim();
  const model = (formData.get("model") as string)?.trim() || null;
  const serialNumber = (formData.get("serialNumber") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "Disponible";
  const physicalCondition = (formData.get("physicalCondition") as string)?.trim() || "Excelente";
  const location = (formData.get("location") as string)?.trim() || null;
  const accessories = (formData.get("accessories") as string)?.trim() || null;
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name || !category || !brand) {
    throw new Error("Nombre, Categoría y Marca son campos obligatorios.");
  }

  await prisma.equipment.update({
    where: { id },
    data: {
      name,
      category,
      brand,
      model,
      serialNumber,
      status,
      physicalCondition,
      location,
      accessories,
      photoUrl,
      notes,
    },
  });

  revalidatePath("/marketing/equipment");
}

export async function deleteEquipment(id: string) {
  await checkMarketingAccess();

  // Protección de trazabilidad histórica
  const loansCount = await prisma.equipmentLoanItem.count({
    where: { equipmentId: id },
  });

  if (loansCount > 0) {
    throw new Error(
      `No se puede eliminar este equipo porque cuenta con ${loansCount} registro(s) histórico(s) de préstamos o actas. Si ya no está en servicio, cámbielo a estado 'Baja'.`
    );
  }

  await prisma.equipment.delete({
    where: { id },
  });

  revalidatePath("/marketing/equipment");
}

// ------------------------------------------------------------
// GESTIÓN DE PRÉSTAMOS Y ACTAS (F-MKT-01 / F-MKT-02)
// ------------------------------------------------------------

export async function createEquipmentLoan(formData: FormData) {
  const { userId } = await checkMarketingAccess();

  const purpose = (formData.get("purpose") as string)?.trim();
  const startDateStr = (formData.get("startDate") as string)?.trim();
  const startTimeStr = (formData.get("startTime") as string)?.trim() || "08:00";
  const expectedReturnDateStr = (formData.get("expectedReturnDate") as string)?.trim();
  const expectedReturnTimeStr = (formData.get("expectedReturnTime") as string)?.trim() || "18:00";
  const borrowerId = (formData.get("borrowerId") as string)?.trim() || userId;
  const taskId = (formData.get("taskId") as string)?.trim() || null;
  const requestId = (formData.get("requestId") as string)?.trim() || null;
  const departureNotes = (formData.get("departureNotes") as string)?.trim() || null;
  const departurePhotoUrl = (formData.get("departurePhotoUrl") as string)?.trim() || null;

  const equipmentIdsJson = formData.get("equipmentIds") as string;
  let equipmentIds: string[] = [];
  try {
    equipmentIds = JSON.parse(equipmentIdsJson || "[]");
  } catch {
    equipmentIds = [];
  }

  if (!purpose || !startDateStr || !expectedReturnDateStr || equipmentIds.length === 0) {
    throw new Error("Debe ingresar el motivo, las fechas del préstamo y seleccionar al menos un equipo.");
  }

  const startDate = new Date(`${startDateStr}T${startTimeStr}:00`);
  const expectedReturnDate = new Date(`${expectedReturnDateStr}T${expectedReturnTimeStr}:00`);

  if (expectedReturnDate <= startDate) {
    throw new Error("La fecha de devolución debe ser posterior a la fecha de entrega.");
  }

  // REGLA CRÍTICA DE NEGOCIO (Punto 1006):
  // Validar que ningún equipo seleccionado tenga préstamos simultáneos incompatibles
  for (const eqId of equipmentIds) {
    const eq = await prisma.equipment.findUnique({
      where: { id: eqId },
      include: {
        loanItems: {
          include: { loan: true },
          where: {
            loan: {
              status: { in: ["Aprobado", "Entregado"] },
            },
          },
        },
      },
    });

    if (!eq) continue;

    if (eq.status === "Prestado" || eq.status === "En Mantenimiento" || eq.status === "Baja") {
      throw new Error(
        `El equipo ${eq.name} (${eq.code}) no está disponible en este momento (Estado actual: ${eq.status}).`
      );
    }

    // Comprobar si hay préstamo activo que solape con las fechas solicitadas
    const overlappingLoan = eq.loanItems.find((li) => {
      const loan = li.loan;
      return (
        startDate < loan.expectedReturnDate &&
        expectedReturnDate > loan.startDate
      );
    });

    if (overlappingLoan) {
      throw new Error(
        `El equipo ${eq.name} (${eq.code}) ya se encuentra reservado en el préstamo ${overlappingLoan.loan.folio} para el período solicitado.`
      );
    }
  }

  // Generar folio de préstamo correlativo
  const count = await prisma.equipmentLoan.count();
  const folio = `PREST-MKT-${String(count + 1).padStart(6, "0")}`;

  await prisma.equipmentLoan.create({
    data: {
      folio,
      purpose,
      startDate,
      expectedReturnDate,
      status: "Solicitado",
      borrowerId,
      taskId: taskId || undefined,
      requestId: requestId || undefined,
      departureNotes,
      departurePhotoUrl,
      items: {
        create: equipmentIds.map((eqId) => ({
          equipmentId: eqId,
        })),
      },
    },
  });

  revalidatePath("/marketing/equipment");
}

export async function authorizeAndDeliverLoan(formData: FormData) {
  const { userId } = await checkMarketingAccess();

  const loanId = formData.get("loanId") as string;
  if (!loanId) throw new Error("ID de préstamo requerido.");

  const departureNotes = (formData.get("departureNotes") as string)?.trim() || null;
  const departurePhotoUrl = (formData.get("departurePhotoUrl") as string)?.trim() || null;

  const loan = await prisma.equipmentLoan.findUnique({
    where: { id: loanId },
    include: { items: true },
  });

  if (!loan) throw new Error("Préstamo no encontrado.");
  if (loan.status === "Entregado" || loan.status === "Devuelto") {
    throw new Error(`El préstamo ya se encuentra en estado ${loan.status}.`);
  }

  // Actualizar préstamo a Entregado (F-MKT-01)
  await prisma.equipmentLoan.update({
    where: { id: loanId },
    data: {
      status: "Entregado",
      authorizedById: userId,
      departureNotes: departureNotes || loan.departureNotes,
      departurePhotoUrl: departurePhotoUrl || loan.departurePhotoUrl,
    },
  });

  // Marcar todos los equipos como 'Prestado'
  const equipmentIds = loan.items.map((i) => i.equipmentId);
  await prisma.equipment.updateMany({
    where: { id: { in: equipmentIds } },
    data: { status: "Prestado" },
  });

  revalidatePath("/marketing/equipment");
}

export async function processLoanReturn(formData: FormData) {
  await checkMarketingAccess();

  const loanId = formData.get("loanId") as string;
  if (!loanId) throw new Error("ID de préstamo requerido.");

  const hasIssues = formData.get("hasIssues") === "true";
  const returnNotes = (formData.get("returnNotes") as string)?.trim() || null;
  const returnPhotoUrl = (formData.get("returnPhotoUrl") as string)?.trim() || null;

  const loan = await prisma.equipmentLoan.findUnique({
    where: { id: loanId },
    include: { items: true },
  });

  if (!loan) throw new Error("Préstamo no encontrado.");

  const finalStatus = hasIssues ? "Devuelto con Novedad" : "Devuelto";

  // Registrar devolución (F-MKT-02)
  await prisma.equipmentLoan.update({
    where: { id: loanId },
    data: {
      status: finalStatus,
      actualReturnDate: new Date(),
      returnNotes,
      returnPhotoUrl,
    },
  });

  // Devolver los equipos a estado 'Disponible' (o en mantenimiento si reportó novedad)
  const equipmentIds = loan.items.map((i) => i.equipmentId);
  await prisma.equipment.updateMany({
    where: { id: { in: equipmentIds } },
    data: {
      status: hasIssues ? "En Mantenimiento" : "Disponible",
    },
  });

  revalidatePath("/marketing/equipment");
}
