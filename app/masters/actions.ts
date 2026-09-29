"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

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

  const isAreaDirector = user.roles.some(
    (r) =>
      r.role.name === "Director de Área" ||
      r.role.name.toLowerCase().includes("director")
  );
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

// ============================================================
// GESTIÓN DE ROLES, PERMISOS DE VISTAS Y DELEGACIÓN DE USUARIOS
// ============================================================

async function verifyAdminPermission() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isGeneralAdmin = user.roles.some(
    (r) =>
      r.role.name === "Administrador General" ||
      r.role.name === "Gerencia" ||
      r.role.permissions.some((p) => p.permission.key === "masters:manage_roles")
  );

  if (!isGeneralAdmin) {
    throw new Error(
      "Acceso denegado: se requieren permisos de Administración General para configurar roles, permisos y delegaciones."
    );
  }

  return user;
}

export async function createRole(formData: FormData) {
  await verifyAdminPermission();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    throw new Error("Debe ingresar un nombre para el rol.");
  }

  const existing = await prisma.role.findUnique({
    where: { name },
  });

  if (existing) {
    throw new Error(`El rol "${name}" ya se encuentra registrado.`);
  }

  await prisma.role.create({
    data: {
      name,
      description,
    },
  });

  revalidatePath("/masters");
}

export async function updateRole(formData: FormData) {
  await verifyAdminPermission();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!id || !name) {
    throw new Error("Debe indicar el identificador y el nombre del rol.");
  }

  const current = await prisma.role.findUniqueOrThrow({
    where: { id },
  });

  // Impedir renombrar roles de sistema esenciales si se desea mantener coherencia
  if (current.name === "Administrador General" && name !== "Administrador General") {
    throw new Error("El rol 'Administrador General' es un rol estructural del sistema y no puede ser renombrado.");
  }

  await prisma.role.update({
    where: { id },
    data: {
      name,
      description,
    },
  });

  revalidatePath("/masters");
}

export async function deleteRole(formData: FormData) {
  await verifyAdminPermission();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("ID de rol no proporcionado.");
  }

  const current = await prisma.role.findUniqueOrThrow({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (
    current.name === "Administrador General" ||
    current.name === "Director de Área" ||
    current.name === "Operador"
  ) {
    throw new Error(`El rol "${current.name}" es un rol estándar del sistema y no puede eliminarse.`);
  }

  if (current._count.users > 0) {
    throw new Error(
      `No es posible eliminar el rol "${current.name}": actualmente tiene ${current._count.users} usuario(s) asignado(s). Reasigne primero los usuarios a otro rol.`
    );
  }

  // Eliminar permisos asociados y el rol
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.role.delete({ where: { id } }),
  ]);

  revalidatePath("/masters");
}

export async function updateRolePermissions(formData: FormData) {
  await verifyAdminPermission();

  const roleId = String(formData.get("roleId") ?? "").trim();
  const permissionIdsRaw = String(formData.get("permissionIds") ?? "[]");

  if (!roleId) {
    throw new Error("ID de rol no proporcionado.");
  }

  let permissionIds: string[] = [];
  try {
    permissionIds = JSON.parse(permissionIdsRaw);
  } catch {
    throw new Error("Formato de permisos inválido.");
  }

  // Actualizar en transacción
  await prisma.$transaction(async (tx) => {
    // Eliminar permisos anteriores
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    // Crear nuevos permisos
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/masters");
  revalidatePath("/management");
  revalidatePath("/goals");
  revalidatePath("/marketing");
  revalidatePath("/commercial");
  revalidatePath("/requests");
}

export async function updateUserDelegation(formData: FormData) {
  await verifyAdminPermission();

  const userId = String(formData.get("userId") ?? "").trim();
  const roleIdsRaw = String(formData.get("roleIds") ?? "[]");
  const areaIdsRaw = String(formData.get("areaIds") ?? "[]");
  const activeRaw = formData.get("active");

  if (!userId) {
    throw new Error("ID de usuario no proporcionado.");
  }

  let roleIds: string[] = [];
  let areaIds: string[] = [];
  try {
    roleIds = JSON.parse(roleIdsRaw);
    areaIds = JSON.parse(areaIdsRaw);
  } catch {
    throw new Error("Formato de roles o áreas inválido.");
  }

  const active = activeRaw === "true" || activeRaw === "on";

  await prisma.$transaction(async (tx) => {
    // 1. Actualizar estado activo
    await tx.user.update({
      where: { id: userId },
      data: { active },
    });

    // 2. Reemplazar roles
    await tx.userRole.deleteMany({
      where: { userId },
    });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      });
    }

    // 3. Reemplazar membresía / delegación operativa a áreas
    await tx.userArea.deleteMany({
      where: { userId },
    });
    if (areaIds.length > 0) {
      await tx.userArea.createMany({
        data: areaIds.map((areaId) => ({
          userId,
          areaId,
        })),
      });
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/masters");
  revalidatePath("/requests");
}

export async function createUser(formData: FormData) {
  await verifyAdminPermission();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const roleIdsRaw = String(formData.get("roleIds") ?? "[]");
  const areaIdsRaw = String(formData.get("areaIds") ?? "[]");

  if (!name || !email || !password) {
    throw new Error("Nombre, correo electrónico y contraseña son obligatorios.");
  }

  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  let roleIds: string[] = [];
  let areaIds: string[] = [];
  try {
    roleIds = JSON.parse(roleIdsRaw);
    areaIds = JSON.parse(areaIdsRaw);
  } catch {
    throw new Error("Formato de roles o áreas inválido.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error(`El correo "${email}" ya se encuentra registrado.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        active: true,
      },
    });

    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: newUser.id,
          roleId,
        })),
      });
    }

    if (areaIds.length > 0) {
      await tx.userArea.createMany({
        data: areaIds.map((areaId) => ({
          userId: newUser.id,
          areaId,
        })),
      });
    }
  });

  revalidatePath("/masters");
}

export async function toggleUserStatus(formData: FormData) {
  await verifyAdminPermission();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    throw new Error("ID de usuario no especificado.");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      active: !user.active,
    },
  });

  revalidatePath("/masters");
}

// ------------------------------------------------------------
// GESTIÓN DE PROYECTOS INMOBILIARIOS / COMERCIALES
// ------------------------------------------------------------

async function verifyProjectPermission() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
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

  if (!user) {
    redirect("/login");
  }

  const isGeneralAdmin = user.roles.some(
    (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
  );

  const isCommercialDirectorOrLeader =
    user.roles.some((r) => {
      const name = r.role.name.toLowerCase();
      return name.includes("director") || name.includes("gerente") || name.includes("comercial");
    }) ||
    user.areas.some((a) => a.area.name.toLowerCase().includes("comercial"));

  const userPermissions = user.roles.flatMap((r) =>
    r.role.permissions.map((p) => p.permission.key)
  );

  const canManageProjects =
    isGeneralAdmin ||
    isCommercialDirectorOrLeader ||
    userPermissions.includes("masters:manage_catalogs") ||
    userPermissions.includes("commercial:view");

  if (!canManageProjects) {
    throw new Error(
      "Acceso denegado: no cuenta con permisos suficientes para gestionar el catálogo de proyectos comerciales."
    );
  }

  return { user, isGeneralAdmin };
}

function parseListString(raw: string, defaultItem: string): string[] {
  if (!raw || !raw.trim()) return [defaultItem];
  const items = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? Array.from(new Set(items)) : [defaultItem];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function saveProjectLogoFile(
  fileEntry: FormDataEntryValue | null,
  slug: string
): Promise<string | null> {
  if (!fileEntry || !(fileEntry instanceof File) || fileEntry.size === 0) {
    return null;
  }

  const bytes = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalName = fileEntry.name || "logo.png";
  const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : "png";
  const validExts = ["png", "jpg", "jpeg", "webp", "svg"];
  const ext = validExts.includes(rawExt) ? rawExt : "png";

  const fileName = `${slug}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "logos", "projects");
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);
  return `/logos/projects/${fileName}`;
}

export async function createCommercialProject(formData: FormData) {
  await verifyProjectPermission();

  const name = String(formData.get("name") ?? "").trim();
  const rawLegalName = String(formData.get("legalName") ?? "").trim();
  const legalName = rawLegalName || name.toUpperCase();
  const location = String(formData.get("location") ?? "").trim();
  const cityDepartment = String(formData.get("cityDepartment") ?? "").trim();
  const authorizedBankAccounts = String(formData.get("authorizedBankAccounts") ?? "").trim();
  const defaultPricePerM2 = Math.max(1000, Number(formData.get("defaultPricePerM2")) || 150000);
  const stagesRaw = String(formData.get("stages") ?? "");
  const blocksRaw = String(formData.get("blocks") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    throw new Error("El nombre comercial del proyecto es obligatorio.");
  }
  if (!location) {
    throw new Error("La ubicación o dirección legal del proyecto es obligatoria.");
  }
  if (!cityDepartment) {
    throw new Error("El municipio y departamento son obligatorios.");
  }
  if (!authorizedBankAccounts) {
    throw new Error("Las cuentas bancarias autorizadas para pagos son obligatorias.");
  }

  const stages = parseListString(stagesRaw, "Etapa 1");
  const blocks = parseListString(blocksRaw, "Manzana A");

  let slug = generateSlug(name);
  const existingWithSlug = await prisma.commercialProject.findFirst({
    where: { slug },
  });
  if (existingWithSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const existingWithName = await prisma.commercialProject.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existingWithName) {
    throw new Error(`Ya existe un proyecto registrado con el nombre "${name}".`);
  }

  // Procesar archivo de imagen del logo
  const uploadedLogoUrl = await saveProjectLogoFile(formData.get("logoFile"), slug);
  const rawLogoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const logoUrl = uploadedLogoUrl || rawLogoUrl;

  await prisma.commercialProject.create({
    data: {
      slug,
      name,
      legalName,
      location,
      cityDepartment,
      authorizedBankAccounts,
      defaultPricePerM2,
      stages,
      blocks,
      description,
      logoUrl,
      active: true,
    },
  });

  revalidatePath("/masters");
  revalidatePath("/commercial");
  revalidatePath("/commercial/quotes");
  revalidatePath("/commercial/contracts");
  revalidatePath("/commercial/schedule");
  revalidatePath("/commercial/clients");
}

export async function updateCommercialProject(formData: FormData) {
  await verifyProjectPermission();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("ID de proyecto no especificado.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const rawLegalName = String(formData.get("legalName") ?? "").trim();
  const legalName = rawLegalName || name.toUpperCase();
  const location = String(formData.get("location") ?? "").trim();
  const cityDepartment = String(formData.get("cityDepartment") ?? "").trim();
  const authorizedBankAccounts = String(formData.get("authorizedBankAccounts") ?? "").trim();
  const defaultPricePerM2 = Math.max(1000, Number(formData.get("defaultPricePerM2")) || 150000);
  const stagesRaw = String(formData.get("stages") ?? "");
  const blocksRaw = String(formData.get("blocks") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    throw new Error("El nombre comercial del proyecto es obligatorio.");
  }
  if (!location) {
    throw new Error("La ubicación legal del proyecto es obligatoria.");
  }
  if (!cityDepartment) {
    throw new Error("El municipio y departamento son obligatorios.");
  }
  if (!authorizedBankAccounts) {
    throw new Error("Las cuentas bancarias autorizadas son obligatorias.");
  }

  const stages = parseListString(stagesRaw, "Etapa 1");
  const blocks = parseListString(blocksRaw, "Manzana A");

  const existing = await prisma.commercialProject.findUniqueOrThrow({
    where: { id },
  });

  // Si cambia el nombre, verificar que no colisione con otro
  if (existing.name.toLowerCase() !== name.toLowerCase()) {
    const duplicate = await prisma.commercialProject.findFirst({
      where: {
        id: { not: id },
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (duplicate) {
      throw new Error(`Ya existe otro proyecto registrado con el nombre "${name}".`);
    }
  }

  // Procesar actualización o eliminación de logo
  const removeLogo = formData.get("removeLogo") === "true";
  const uploadedLogoUrl = await saveProjectLogoFile(formData.get("logoFile"), existing.slug);
  const rawLogoUrl = String(formData.get("logoUrl") ?? "").trim();

  let logoUrl = existing.logoUrl;
  if (removeLogo) {
    logoUrl = null;
  } else if (uploadedLogoUrl) {
    logoUrl = uploadedLogoUrl;
  } else if (rawLogoUrl !== "") {
    logoUrl = rawLogoUrl;
  }

  await prisma.commercialProject.update({
    where: { id },
    data: {
      name,
      legalName,
      location,
      cityDepartment,
      authorizedBankAccounts,
      defaultPricePerM2,
      stages,
      blocks,
      description,
      logoUrl,
    },
  });

  revalidatePath("/masters");
  revalidatePath("/commercial");
  revalidatePath("/commercial/quotes");
  revalidatePath("/commercial/contracts");
  revalidatePath("/commercial/schedule");
  revalidatePath("/commercial/clients");
}

export async function toggleCommercialProjectActive(id: string) {
  await verifyProjectPermission();

  if (!id) {
    throw new Error("ID de proyecto no especificado.");
  }

  const project = await prisma.commercialProject.findUniqueOrThrow({
    where: { id },
  });

  await prisma.commercialProject.update({
    where: { id },
    data: {
      active: !project.active,
    },
  });

  revalidatePath("/masters");
  revalidatePath("/commercial");
  revalidatePath("/commercial/quotes");
  revalidatePath("/commercial/contracts");
  revalidatePath("/commercial/schedule");
  revalidatePath("/commercial/clients");
}

export async function deleteCommercialProject(id: string) {
  await verifyProjectPermission();

  if (!id) {
    throw new Error("ID de proyecto no especificado.");
  }

  const project = await prisma.commercialProject.findUniqueOrThrow({
    where: { id },
  });

  // Verificar si hay cotizaciones o contratos con este proyecto
  const [quotesCount, contractsCount, bookingsCount] = await Promise.all([
    prisma.commercialQuote.count({
      where: {
        projectName: {
          contains: project.name,
          mode: "insensitive",
        },
      },
    }),
    prisma.commercialContract.count({
      where: {
        projectName: {
          contains: project.name,
          mode: "insensitive",
        },
      },
    }),
    prisma.commercialBooking.count({
      where: {
        project: {
          contains: project.name,
          mode: "insensitive",
        },
      },
    }),
  ]);

  if (quotesCount > 0 || contractsCount > 0 || bookingsCount > 0) {
    // Si tiene registros históricos vinculados, no se borra físicamente para preservar la trazabilidad, se desactiva
    await prisma.commercialProject.update({
      where: { id },
      data: { active: false },
    });

    revalidatePath("/masters");
    revalidatePath("/commercial");
    revalidatePath("/commercial/quotes");
    revalidatePath("/commercial/contracts");
    revalidatePath("/commercial/schedule");
    revalidatePath("/commercial/clients");

    return {
      softDeleted: true,
      message: `El proyecto "${project.name}" tiene ${quotesCount} cotizaciones, ${contractsCount} contratos y/o ${bookingsCount} visitas registradas. Para preservar la trazabilidad jurídica e histórica se ha marcado como Inactivo en lugar de borrarlo permanentemente.`,
    };
  }

  await prisma.commercialProject.delete({
    where: { id },
  });

  revalidatePath("/masters");
  revalidatePath("/commercial");
  revalidatePath("/commercial/quotes");
  revalidatePath("/commercial/contracts");
  revalidatePath("/commercial/schedule");
  revalidatePath("/commercial/clients");

  return { softDeleted: false, message: `Proyecto "${project.name}" eliminado satisfactoriamente.` };
}
