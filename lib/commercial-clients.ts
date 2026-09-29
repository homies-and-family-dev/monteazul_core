import { prisma } from "@/lib/prisma";

export interface UpsertClientInput {
  name: string;
  docType?: string;
  docNumber?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  civilStatus?: string | null;
  bank?: string | null;
  occupation?: string | null;
  notes?: string | null;
  advisorId?: string | null;
  createdById?: string | null;
}

/**
 * Busca un cliente existente por documento, teléfono o correo,
 * o crea uno nuevo en la base de datos unificada del área comercial.
 */
export async function findOrCreateCommercialClient(data: UpsertClientInput) {
  const cleanDoc = data.docNumber?.trim() || null;
  const cleanPhone = data.phone.trim();
  const cleanEmail = data.email?.trim().toLowerCase() || null;
  const cleanName = data.name.trim();

  // 1. Buscar coincidencia por documento (máxima prioridad)
  let client = cleanDoc
    ? await prisma.commercialClient.findUnique({
        where: { docNumber: cleanDoc },
      })
    : null;

  // 2. Si no se encontró por documento, buscar por teléfono
  if (!client && cleanPhone) {
    client = await prisma.commercialClient.findFirst({
      where: { phone: cleanPhone },
    });
  }

  // 3. Si no se encontró, buscar por correo electrónico
  if (!client && cleanEmail) {
    client = await prisma.commercialClient.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });
  }

  // 4. Si ya existe, actualizamos campos complementarios
  if (client) {
    const updateData: any = {};
    if (!client.docNumber && cleanDoc) updateData.docNumber = cleanDoc;
    if (data.docType && data.docType !== client.docType) updateData.docType = data.docType;
    if (cleanName && cleanName.length > client.name.length) updateData.name = cleanName;
    if (data.address && !client.address) updateData.address = data.address.trim();
    if (data.city && (!client.city || client.city === "Colombia")) updateData.city = data.city.trim();
    if (data.civilStatus && !client.civilStatus) updateData.civilStatus = data.civilStatus.trim();
    if (data.bank && !client.bank) updateData.bank = data.bank.trim();
    if (data.occupation && !client.occupation) updateData.occupation = data.occupation.trim();
    if (data.advisorId && !client.assignedAdvisorId) updateData.assignedAdvisorId = data.advisorId;

    if (Object.keys(updateData).length > 0) {
      client = await prisma.commercialClient.update({
        where: { id: client.id },
        data: updateData,
      });
    }

    return client;
  }

  // 5. Si no existe, lo creamos
  client = await prisma.commercialClient.create({
    data: {
      name: cleanName,
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
      assignedAdvisorId: data.advisorId || null,
      createdById: data.createdById || null,
    },
  });

  return client;
}

export type TimelineEvent = {
  id: string;
  type: "VISIT" | "QUOTE" | "VALIDATION" | "CONTRACT";
  date: Date;
  title: string;
  description: string;
  status: string;
  badgeColor: string;
  link?: string;
  linkText?: string;
};

/**
 * Obtiene el expediente 360° del cliente con todas sus actividades, proyectos y documentos vinculados
 */
export async function getClient360(clientId: string) {
  const client = await prisma.commercialClient.findUnique({
    where: { id: clientId },
    include: {
      assignedAdvisor: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      bookings: {
        orderBy: { date: "desc" },
        include: {
          assignedAdvisor: { select: { id: true, name: true } },
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          contract: { select: { id: true, contractNumber: true, status: true, date: true } },
          advisor: { select: { id: true, name: true } },
        },
      },
      contracts: {
        orderBy: { date: "desc" },
        include: {
          quote: { select: { id: true, consecutive: true } },
        },
      },
    },
  });

  if (!client) return null;

  // Colección de proyectos relacionados
  const projectsSet = new Set<string>();
  client.bookings.forEach((b) => projectsSet.add(b.project));
  client.quotes.forEach((q) => projectsSet.add(q.projectName));
  client.contracts.forEach((c) => projectsSet.add(c.projectName));
  const relatedProjects = Array.from(projectsSet);

  // Totales financieros
  const totalQuoted = client.quotes.reduce((acc, q) => acc + q.finalPrice, 0);
  const totalContracted = client.contracts.reduce((acc, c) => acc + c.totalPrice, 0);
  const totalReservationPaid = client.contracts.reduce((acc, c) => acc + c.reservationAmount, 0);

  // Construcción del Timeline cronológico unificado
  const timeline: TimelineEvent[] = [];

  // Eventos de visitas
  client.bookings.forEach((b) => {
    timeline.push({
      id: `booking-${b.id}`,
      type: "VISIT",
      date: new Date(b.date),
      title: `Visita a Terreno: ${b.project}`,
      description: `Agendada con ${b.numAttendees} asistente(s). Asesor: ${
        b.assignedAdvisor?.name || "Sin asignar"
      }. ${b.feedbackNotes ? `Feedback: "${b.feedbackNotes}"` : ""}`,
      status: b.status,
      badgeColor:
        b.status === "REALIZADA"
          ? "bg-emerald-100 text-emerald-800"
          : b.status === "CANCELADA"
          ? "bg-red-100 text-red-800"
          : "bg-blue-100 text-blue-800",
      link: "/commercial/schedule",
      linkText: "Ver en Calendario",
    });
  });

  // Eventos de cotizaciones
  client.quotes.forEach((q) => {
    timeline.push({
      id: `quote-${q.id}`,
      type: "QUOTE",
      date: new Date(q.createdAt),
      title: `Cotización Emitida: ${q.consecutive}`,
      description: `Inmueble: ${q.lotNumber} en ${q.projectName} (${q.totalArea} m²). Monto: $${q.finalPrice.toLocaleString("es-CO")}. Validez: ${q.validityDays} días.`,
      status: q.status,
      badgeColor:
        q.status === "CONTRATADA"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-indigo-100 text-indigo-800",
      link: `/commercial/quotes/${q.id}`,
      linkText: "Ver Cotización",
    });

    if (q.dataValidated && q.validatedAt) {
      timeline.push({
        id: `validation-${q.id}`,
        type: "VALIDATION",
        date: new Date(q.validatedAt),
        title: `Validación de Datos Aprobada (${q.consecutive})`,
        description: `Se validaron los datos legales del cliente y el pago de separación para el proyecto ${q.projectName}. ${q.validationNotes || ""}`,
        status: "VALIDADA",
        badgeColor: "bg-amber-100 text-amber-800",
      });
    }
  });

  // Eventos de contratos
  client.contracts.forEach((c) => {
    timeline.push({
      id: `contract-${c.id}`,
      type: "CONTRACT",
      date: new Date(c.date),
      title: `Contrato de Separación Generado: ${c.contractNumber}`,
      description: `Formalización de reserva para ${c.lotNumber} en ${c.projectName}. Separación: $${c.reservationAmount.toLocaleString("es-CO")}. Total: $${c.totalPrice.toLocaleString("es-CO")}.`,
      status: c.status,
      badgeColor: "bg-emerald-100 text-emerald-800 font-bold",
      link: `/commercial/contracts/${c.id}`,
      linkText: "Ver e Imprimir Contrato",
    });
  });

  // Ordenar timeline por fecha descendente
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    client,
    relatedProjects,
    totalQuoted,
    totalContracted,
    totalReservationPaid,
    timeline,
  };
}
