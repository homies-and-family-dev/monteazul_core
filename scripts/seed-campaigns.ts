import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding marketing campaigns created directly in Marketing module...");

  // Find a marketing user or admin user to be the creator
  const marketingArea = await prisma.area.findUnique({ where: { code: "MKT" } });
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { areas: { some: { areaId: marketingArea?.id } } },
        { roles: { some: { role: { name: { contains: "Admin" } } } } },
      ],
    },
  });

  if (!user) {
    console.error("No suitable user found for campaign creation.");
    return;
  }

  const initialCampaigns = [
    {
      code: "CMP-2026-001",
      name: "Lanzamiento Campestre Altos del Este",
      brand: "Monte Azul Inmobiliaria",
      projectName: "Altos del Este",
      objective: "Lanzamiento Inmobiliario & Ventas",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-05-30"),
      status: "Activa",
      budget: 18500000,
      spent: 7450000,
      targetAudience: "Familias e inversionistas de Ibagué y Bogotá, 32-55 años, estrato 4-6",
      channels: "Meta Ads, Google Ads, Vallas Viales, Eventos Privados",
      description: "Campaña de posicionamiento y apertura comercial del proyecto campestre Altos del Este. Enfoque en calidad de vida, ubicación privilegiada y alta rentabilidad.",
      expectedKpis: "180 leads calificados, 40 visitas presenciales guiadas al lote, 10 contratos de separación firmados.",
    },
    {
      code: "CMP-2026-002",
      name: "Temporada de Inversión El Olimpo",
      brand: "Monte Azul Inmobiliaria",
      projectName: "Condominio Campestre El Olimpo",
      objective: "Generación de Leads Calificados",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-04-15"),
      status: "Activa",
      budget: 12000000,
      spent: 5800000,
      targetAudience: "Compradores de segunda vivienda y turismo ecológico, residentes en Tolima y Cundinamarca",
      channels: "Meta Ads, WhatsApp Marketing, Google Display",
      description: "Pauta digital enfocada en lotes de gran metraje y club social campestre. Retargeting comercial a cotizaciones activas.",
      expectedKpis: "120 prospectos comerciales, 25 cotizaciones formalizadas, 6 separaciones.",
    },
    {
      code: "CMP-2026-003",
      name: "Branding y Solidez Corporativa 2026",
      brand: "Monteazul Group",
      projectName: "Institucional",
      objective: "Branding & Reconocimiento",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-08-30"),
      status: "Planificación",
      budget: 9500000,
      spent: 1200000,
      targetAudience: "Comunidad empresarial, aliados financieros y compradores de proyectos",
      channels: "LinkedIn Ads, Prensa Económica, Video Institucional YouTube, Redes Sociales",
      description: "Construcción de reputación corporativa, trayectoria empresarial y respaldo fiduciario de Monteazul Group S.A.S.",
      expectedKpis: "50.000 reproducciones completas de video institucional, incremento del 35% en búsquedas directas de marca.",
    },
    {
      code: "CMP-2026-004",
      name: "Preventa Exclusiva Lotes Campestres Q1",
      brand: "Monte Azul",
      projectName: "Reserva del Bosque",
      objective: "Conversión y Cierres de Separación",
      startDate: new Date("2025-11-01"),
      endDate: new Date("2026-01-31"),
      status: "Finalizada",
      budget: 14000000,
      spent: 13850000,
      targetAudience: "Compradores en preventa que buscan precios especiales de etapa cero",
      channels: "Meta Ads, Google Ads, Email Marketing",
      description: "Campaña de etapa cero para captación de primeros optantes con descuento comercial de preventa.",
      expectedKpis: "15 separaciones cerradas (100% de la meta cumplida).",
    },
  ];

  for (const cmp of initialCampaigns) {
    const existing = await prisma.marketingCampaign.findUnique({
      where: { code: cmp.code },
    });

    if (existing) {
      console.log(`Campaign ${cmp.code} already exists.`);
    } else {
      console.log(`Creating campaign ${cmp.code}: ${cmp.name}...`);
      await prisma.marketingCampaign.create({
        data: {
          ...cmp,
          createdById: user.id,
          assignedToId: user.id,
        },
      });
    }
  }

  console.log("Seeding campaigns finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
