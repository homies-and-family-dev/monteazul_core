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
    create: { name: "Director de Área", description: "Gestiona y supervisa su área" },
  });

  const rolAdminGeneral = await prisma.role.upsert({
    where: { name: "Administrador General" },
    update: {},
    create: { name: "Administrador General", description: "Visión y control transversal de la plataforma" },
  });

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
      roles: { create: [{ roleId: rolDirector.id }] },
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
      roles: { create: [{ roleId: rolDirector.id }] },
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
      roles: { create: [{ roleId: rolDirector.id }] },
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
