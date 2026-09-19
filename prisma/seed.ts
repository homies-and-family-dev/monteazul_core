import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Contraseña de prueba para TODOS los usuarios del seed (solo demo local)
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Areas -------------------------------------------------
  const marketing = await prisma.area.upsert({
    where: { code: "MKT" },
    update: {},
    create: { name: "Marketing", code: "MKT" },
  });

  const comercial = await prisma.area.upsert({
    where: { code: "COM" },
    update: {},
    create: { name: "Comercial", code: "COM" },
  });

  const administracion = await prisma.area.upsert({
    where: { code: "ADM" },
    update: {},
    create: { name: "Administración", code: "ADM" },
  });

  // --- Roles ---------------------------------------------------
  const rolOperador = await prisma.role.upsert({
    where: { name: "Operador" },
    update: {},
    create: { name: "Operador", description: "Trabaja solicitudes asignadas a su área" },
  });

  const rolDirector = await prisma.role.upsert({
    where: { name: "Director de Área" },
    update: {},
    create: { name: "Director de Área", description: "Rol base de dirección para gestión y supervisión de área" },
  });

  const rolDirectorComercial = await prisma.role.upsert({
    where: { name: "Director Comercial" },
    update: {},
    create: { name: "Director Comercial", description: "Liderazgo comercial, metas de ventas y supervisión de propuestas" },
  });

  const rolDirectorMkt = await prisma.role.upsert({
    where: { name: "Director de Marketing" },
    update: {},
    create: { name: "Director de Marketing", description: "Liderazgo de mercadeo, campañas publicitarias, parrilla editorial y equipos audiovisuales" },
  });

  const rolDirectorAdm = await prisma.role.upsert({
    where: { name: "Director de Administración" },
    update: {},
    create: { name: "Director de Administración", description: "Supervisión administrativa, financiera y contractual corporativa" },
  });

  const rolAdminGeneral = await prisma.role.upsert({
    where: { name: "Administrador General" },
    update: {},
    create: { name: "Administrador General", description: "Visión y control transversal de la plataforma" },
  });

  // --- Permissions ----------------------------------------------
  const systemPermissions = [
    {
      key: "requests:view",
      name: "Ver Bandeja de Solicitudes",
      description: "Consultar solicitudes, filtros y expedientes interactivos (/requests)",
      module: "Solicitudes",
    },
    {
      key: "requests:create",
      name: "Radicar Nuevas Solicitudes",
      description: "Crear y radicar solicitudes interáreas transversales (/requests/new)",
      module: "Solicitudes",
    },
    {
      key: "requests:assign",
      name: "Asignar Operador Responsable",
      description: "Asignar y reasignar operadores a las solicitudes del área",
      module: "Solicitudes",
    },
    {
      key: "requests:work",
      name: "Atender y Cambiar Estados",
      description: "Operar solicitudes, registrar avances, revisiones y devoluciones",
      module: "Solicitudes",
    },
    {
      key: "requests:subtasks",
      name: "Gestionar Subtareas",
      description: "Crear, asignar y completar subtareas operativas dentro del expediente",
      module: "Solicitudes",
    },
    {
      key: "management:view",
      name: "Módulo Gerencial y Analítica",
      description: "Acceso a métricas de cuellos de botella, balance de áreas y saturación (/management)",
      module: "Estrategia y Gerencia",
    },
    {
      key: "goals:view",
      name: "Visualizar Objetivos de Área",
      description: "Consultar objetivos estratégicos y porcentajes de cumplimiento (/goals)",
      module: "Estrategia y Gerencia",
    },
    {
      key: "goals:manage",
      name: "Crear y Actualizar Objetivos",
      description: "Definir nuevas metas estratégicas y registrar avances con justificación",
      module: "Estrategia y Gerencia",
    },
    {
      key: "marketing:view",
      name: "Tablero y Campañas de Marketing",
      description: "Acceso al tablero interactivo de campañas, requerimientos y métricas de Marketing (/marketing)",
      module: "Marketing",
    },
    {
      key: "marketing:calendar",
      name: "Calendario de Contenidos",
      description: "Programación y parrilla editorial multimedia de Marketing (/marketing/calendar)",
      module: "Marketing",
    },
    {
      key: "marketing:equipment",
      name: "Inventario y Préstamos de Equipos",
      description: "Control de equipos, actas F-MKT-01 y F-MKT-02 de salida/retorno (/marketing/equipment)",
      module: "Marketing",
    },
    {
      key: "masters:view",
      name: "Consultar Datos Maestros",
      description: "Visualizar catálogos y parámetros del sistema (/masters)",
      module: "Configuración y Maestros",
    },
    {
      key: "masters:manage_catalogs",
      name: "Gestionar Catálogos y Listas",
      description: "Crear y modificar tipos de solicitud, prioridades y valores maestros",
      module: "Configuración y Maestros",
    },
    {
      key: "masters:manage_roles",
      name: "Gestionar Roles y Delegación",
      description: "Administrar roles, matriz de permisos de vistas y delegación de usuarios",
      module: "Configuración y Maestros",
    },
  ];

  const dbPermissions = [];
  for (const perm of systemPermissions) {
    const p = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description, module: perm.module },
      create: perm,
    });
    dbPermissions.push(p);
  }

  // Vincular permisos al Administrador General (Todos)
  for (const p of dbPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolAdminGeneral.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolAdminGeneral.id, permissionId: p.id },
    });
  }

  // Permisos base de directores (Estrategia, Metas, Solicitudes y Maestros; SIN herramientas especializadas de Marketing)
  const directorBaseKeys = [
    "requests:view", "requests:create", "requests:assign", "requests:work", "requests:subtasks",
    "management:view", "goals:view", "goals:manage", "masters:view", "masters:manage_catalogs",
  ];

  // Vincular permisos a Director de Área (Base)
  for (const p of dbPermissions.filter((item) => directorBaseKeys.includes(item.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolDirector.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolDirector.id, permissionId: p.id },
    });
  }

  // Vincular permisos a Director Comercial (Sin Marketing)
  for (const p of dbPermissions.filter((item) => directorBaseKeys.includes(item.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolDirectorComercial.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolDirectorComercial.id, permissionId: p.id },
    });
  }

  // Vincular permisos a Director de Administración (Sin Marketing)
  for (const p of dbPermissions.filter((item) => directorBaseKeys.includes(item.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolDirectorAdm.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolDirectorAdm.id, permissionId: p.id },
    });
  }

  // Vincular permisos a Director de Marketing (Con Campañas, Calendario y Equipos)
  const directorMktKeys = [
    ...directorBaseKeys,
    "marketing:view",
    "marketing:calendar",
    "marketing:equipment",
  ];
  for (const p of dbPermissions.filter((item) => directorMktKeys.includes(item.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolDirectorMkt.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolDirectorMkt.id, permissionId: p.id },
    });
  }

  // Vincular permisos a Operador
  const operadorKeys = ["requests:view", "requests:create", "requests:work", "requests:subtasks"];
  for (const p of dbPermissions.filter((item) => operadorKeys.includes(item.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rolOperador.id, permissionId: p.id } },
      update: {},
      create: { roleId: rolOperador.id, permissionId: p.id },
    });
  }

  // --- Users -----------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@monteazul.com" },
    update: {},
    create: {
      name: "Admin General",
      email: "admin@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolAdminGeneral.id }] },
    },
  });

  const directorMkt = await prisma.user.upsert({
    where: { email: "directora.marketing@monteazul.com" },
    update: {},
    create: {
      name: "Directora de Marketing",
      email: "directora.marketing@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolDirectorMkt.id }] },
      areas: { create: [{ areaId: marketing.id }] },
    },
  });

  const operadorMkt = await prisma.user.upsert({
    where: { email: "operador.marketing@monteazul.com" },
    update: {},
    create: {
      name: "Operador de Marketing",
      email: "operador.marketing@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolOperador.id }] },
      areas: { create: [{ areaId: marketing.id }] },
    },
  });

  const directorComercial = await prisma.user.upsert({
    where: { email: "director.comercial@monteazul.com" },
    update: {},
    create: {
      name: "Director Comercial",
      email: "director.comercial@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolDirectorComercial.id }] },
      areas: { create: [{ areaId: comercial.id }] },
    },
  });

  const operadorComercial = await prisma.user.upsert({
    where: { email: "operador.comercial@monteazul.com" },
    update: {},
    create: {
      name: "Operador Comercial",
      email: "operador.comercial@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolOperador.id }] },
      areas: { create: [{ areaId: comercial.id }] },
    },
  });

  const directorAdministracion = await prisma.user.upsert({
    where: { email: "director.administracion@monteazul.com" },
    update: {},
    create: {
      name: "Director de Administración",
      email: "director.administracion@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolDirectorAdm.id }] },
      areas: { create: [{ areaId: administracion.id }] },
    },
  });

  const operadorAdministracion = await prisma.user.upsert({
    where: { email: "operador.administracion@monteazul.com" },
    update: {},
    create: {
      name: "Operador de Administración",
      email: "operador.administracion@monteazul.com",
      passwordHash,
      roles: { create: [{ roleId: rolOperador.id }] },
      areas: { create: [{ areaId: administracion.id }] },
    },
  });

  // --- Master Data (Tipos de Solicitud y Prioridades) ---------
  const masterTypeRequest = await prisma.masterType.upsert({
    where: { key: "request_type" },
    update: {},
    create: { key: "request_type", name: "Tipo de Solicitud" },
  });

  const masterTypePriority = await prisma.masterType.upsert({
    where: { key: "priority" },
    update: {},
    create: { key: "priority", name: "Prioridad" },
  });

  // Prioridades Corporativas (área null)
  const prioridades = ["Baja", "Media", "Alta", "Urgente"];
  for (const val of prioridades) {
    const exists = await prisma.masterValue.findFirst({
      where: { masterTypeId: masterTypePriority.id, areaId: null, value: val },
    });
    if (!exists) {
      await prisma.masterValue.create({
        data: { masterTypeId: masterTypePriority.id, areaId: null, value: val },
      });
    }
  }

  // Tipos de Solicitud por Área de Destino
  const tiposMkt = [
    "Pieza gráfica para campaña",
    "Contenido para redes sociales",
    "Producción audiovisual / Video",
    "Diseño de material impreso",
    "Ajuste / Adaptación de pieza",
  ];
  for (const val of tiposMkt) {
    const exists = await prisma.masterValue.findFirst({
      where: { masterTypeId: masterTypeRequest.id, areaId: marketing.id, value: val },
    });
    if (!exists) {
      await prisma.masterValue.create({
        data: { masterTypeId: masterTypeRequest.id, areaId: marketing.id, value: val },
      });
    }
  }

  const tiposCom = [
    "Propuesta comercial / Cotización",
    "Revisión de contrato / cliente",
    "Acompañamiento a reunión comercial",
    "Información de producto / tarifas",
  ];
  for (const val of tiposCom) {
    const exists = await prisma.masterValue.findFirst({
      where: { masterTypeId: masterTypeRequest.id, areaId: comercial.id, value: val },
    });
    if (!exists) {
      await prisma.masterValue.create({
        data: { masterTypeId: masterTypeRequest.id, areaId: comercial.id, value: val },
      });
    }
  }

  const tiposAdm = [
    "Aprobación de orden de compra / pago",
    "Gestión de suministros o recursos",
    "Trámite legal o contractual",
    "Soporte administrativo general",
  ];
  for (const val of tiposAdm) {
    const exists = await prisma.masterValue.findFirst({
      where: { masterTypeId: masterTypeRequest.id, areaId: administracion.id, value: val },
    });
    if (!exists) {
      await prisma.masterValue.create({
        data: { masterTypeId: masterTypeRequest.id, areaId: administracion.id, value: val },
      });
    }
  }

  console.log("Seed completado. Contraseña de prueba para todos:", DEMO_PASSWORD);
  console.log({
    areas: [marketing.name, comercial.name, administracion.name],
    usuarios: [
      admin.email,
      directorMkt.email,
      operadorMkt.email,
      directorComercial.email,
      operadorComercial.email,
      directorAdministracion.email,
      operadorAdministracion.email,
    ],
    maestros: ["Prioridades cargadas", "Tipos de solicitud por área cargados"],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
