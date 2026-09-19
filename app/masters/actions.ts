"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function verifyMasterPermission(targetAreaId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { include: { role: true } },
      areas: { include: { area: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isGeneralAdmin = user.roles.some(
    (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
  );

  const isAreaDirector = user.roles.some((r) => r.role.name === "Director de Área");
  const userAreaIds = user.areas.map((a) => a.areaId);

  // Ámbito corporativo (sin área): sólo administradores generales o gerencia
  if (!targetAreaId) {
    if (!isGeneralAdmin) {
      throw new Error(
        "Acceso denegado: solo el Administrador General o Gerencia pueden gestionar catálogos y valores de ámbito corporativo."
      );
    }
    return { user, isGeneralAdmin, isAreaDirector, userAreaIds };
  }

  // Ámbito específico de un área: el director de dicha área o el administrador general
  if (!isGeneralAdmin && (!isAreaDirector || !userAreaIds.includes(targetAreaId))) {
    throw new Error(
      "Acceso denegado: no tiene permisos de dirección sobre el área correspondiente a este valor maestro."
    );
  }

  return { user, isGeneralAdmin, isAreaDirector, userAreaIds };
}

export async function createMasterValue(formData: FormData) {
  const masterTypeId = String(formData.get("masterTypeId") ?? "").trim();
  const rawAreaId = String(formData.get("areaId") ?? "").trim();
  const areaId = rawAreaId === "" || rawAreaId === "corporate" ? null : rawAreaId;
  const value = String(formData.get("value") ?? "").trim();

  if (!masterTypeId || !value) {
    throw new Error("Debe seleccionar un catálogo y especificar el nombre del valor.");
  }

  await verifyMasterPermission(areaId);

  const existing = await prisma.masterValue.findFirst({
    where: {
      masterTypeId,
      areaId,
      value: {
        equals: value,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error(
      `El valor "${value}" ya se encuentra registrado para este catálogo y ámbito.`
    );
  }

  await prisma.masterValue.create({
    data: {
      masterTypeId,
      areaId,
      value,
      active: true,
    },
  });

  revalidatePath("/masters");
  revalidatePath("/requests/new");
  revalidatePath("/requests");
}

export async function updateMasterValue(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const newValue = String(formData.get("value") ?? "").trim();

  if (!id || !newValue) {
    throw new Error("Datos incompletos para actualizar el valor maestro.");
  }

  const current = await prisma.masterValue.findUniqueOrThrow({
    where: { id },
  });

  await verifyMasterPermission(current.areaId);

  // Verificar si no hay conflicto de duplicidad
  const duplicate = await prisma.masterValue.findFirst({
    where: {
      id: { not: id },
      masterTypeId: current.masterTypeId,
      areaId: current.areaId,
      value: {
        equals: newValue,
        mode: "insensitive",
      },
    },
  });

  if (duplicate) {
    throw new Error(`Ya existe otro registro con el nombre "${newValue}" en este ámbito.`);
  }

  await prisma.masterValue.update({
    where: { id },
    data: { value: newValue },
  });

  revalidatePath("/masters");
  revalidatePath("/requests/new");
  revalidatePath("/requests");
}

export async function toggleMasterValueStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Identificador de valor maestro no proporcionado.");
  }

  const current = await prisma.masterValue.findUniqueOrThrow({
    where: { id },
  });

  await verifyMasterPermission(current.areaId);

  await prisma.masterValue.update({
    where: { id },
    data: { active: !current.active },
  });

  revalidatePath("/masters");
  revalidatePath("/requests/new");
  revalidatePath("/requests");
}

export async function deleteMasterValue(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Identificador de valor maestro no proporcionado.");
  }

  const current = await prisma.masterValue.findUniqueOrThrow({
    where: { id },
  });

  await verifyMasterPermission(current.areaId);

  // Verificación de integridad histórica (Punto 25 del Documento Maestro)
  // No permitir eliminación física si ya fue utilizado en solicitudes existentes
  const historicalUsageCount = await prisma.request.count({
    where: {
      OR: [
        { type: current.value },
        { priority: current.value },
      ],
    },
  });

  if (historicalUsageCount > 0) {
    throw new Error(
      `No es posible eliminar físicamente el valor "${current.value}": se encuentra registrado en ${historicalUsageCount} solicitud(es) histórica(s). Por políticas de trazabilidad e integridad documental, desactívelo en su lugar utilizando la opción de estado.`
    );
  }

  await prisma.masterValue.delete({
    where: { id },
  });

  revalidatePath("/masters");
  revalidatePath("/requests/new");
  revalidatePath("/requests");
}

export async function createMasterType(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rawKey = String(formData.get("key") ?? "").trim();

  if (!name) {
    throw new Error("Debe ingresar el nombre del nuevo catálogo maestro.");
  }

  // Creación de nuevos catálogos maestros reservada a administración general
  await verifyMasterPermission(null);

  const key = (
    rawKey ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  ).trim();

  const existing = await prisma.masterType.findUnique({
    where: { key },
  });

  if (existing) {
    throw new Error(`El catálogo con la clave "${key}" ya existe.`);
  }

  await prisma.masterType.create({
    data: {
      name,
      key,
    },
  });

  revalidatePath("/masters");
  revalidatePath("/requests/new");
}
