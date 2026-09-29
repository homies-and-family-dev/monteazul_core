import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { COMMERCIAL_PROJECTS, MONTEAZUL_PROMOTER } from "../lib/commercial-projects";
import { numberToWordsPesos } from "../lib/number-to-words";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedCommercial() {
  console.log("Seeding Commercial Quotes and Contracts...");

  // Buscar usuario asesor comercial o admin
  const advisor =
    (await prisma.user.findFirst({
      where: { email: "operador.comercial@monteazul.com" },
    })) ||
    (await prisma.user.findFirst({
      where: { email: "admin@monteazul.com" },
    })) ||
    (await prisma.user.findFirst());

  if (!advisor) {
    console.error("No se encontró ningún usuario para asociar como asesor.");
    return;
  }

  // Verificar si ya hay cotizaciones
  const existingCount = await prisma.commercialQuote.count();
  if (existingCount > 0) {
    console.log(`Ya existen ${existingCount} cotizaciones en la base de datos.`);
    return;
  }

  // 1. Cotización 1: Altos Las Victorias (Emitida)
  const cot1 = await prisma.commercialQuote.create({
    data: {
      consecutive: "COT-2026-0001",
      status: "EMITIDA",
      date: new Date(),
      validityDays: 3,
      projectName: "Altos Las Victorias",
      stage: "Etapa 1",
      block: "Manzana A",
      lotNumber: "Lote 12",
      totalArea: 120,
      pricePerSquareMeter: 150000,
      totalPrice: 18000000,
      clientName: "Carlos Eduardo Gómez",
      clientDocType: "CC",
      clientDocNumber: "79845123",
      clientPhone: "3158904561",
      clientEmail: "carlos.gomez@ejemplo.com",
      clientAddress: "Calle 127 # 19-45, Bogotá",
      clientCity: "Bogotá, Colombia",
      clientCivilStatus: "Casado(a)",
      clientBank: "Bancolombia",
      clientParticipation: 100,
      hasDiscount: true,
      discountAmount: 1000000,
      discountDescription: "Bono Especial Preventa",
      finalPrice: 17000000,
      reservationAmount: 5000000,
      reservationDate: new Date(),
      initialQuotaPercent: 10,
      initialQuotaAmount: 1700000,
      financedBalance: 12000000,
      installmentsCount: 24,
      installmentAmount: 500000,
      observations: "Cliente interesado en vista panorámica a la cordillera. Pendiente comprobante de separación.",
      advisorId: advisor.id,
      createdById: advisor.id,
    },
  });

  // 2. Cotización 2: Club Náutico Monteazul -> Convertida a Contrato
  const cot2 = await prisma.commercialQuote.create({
    data: {
      consecutive: "COT-2026-0002",
      status: "CONTRATADA",
      date: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      validityDays: 3,
      projectName: "Club Náutico Monteazul",
      stage: "Etapa Náutica",
      block: "Manzana B",
      lotNumber: "Lote Náutico 05",
      totalArea: 200,
      pricePerSquareMeter: 250000,
      totalPrice: 50000000,
      clientName: "Marcela Restrepo Ochoa",
      clientDocType: "CC",
      clientDocNumber: "52489632",
      clientPhone: "3104567890",
      clientEmail: "marcela.restrepo@ejemplo.com",
      clientAddress: "Carrera 7 # 116-50 Of 502, Bogotá",
      clientCity: "Bogotá, Colombia",
      clientCivilStatus: "Casado(a)",
      clientBank: "Davivienda",
      clientParticipation: 50,
      hasSecondOptant: true,
      secondOptantName: "Felipe Restrepo Ochoa",
      secondOptantDocType: "CC",
      secondOptantDocNumber: "80123456",
      secondOptantPhone: "3129876543",
      secondOptantEmail: "felipe.restrepo@ejemplo.com",
      secondOptantAddress: "Carrera 7 # 116-50 Of 502, Bogotá",
      secondOptantCity: "Bogotá, Colombia",
      secondOptantCivilStatus: "Soltero(a)",
      secondOptantBank: "Bancolombia",
      secondOptantParticipation: 50,
      hasDiscount: false,
      discountAmount: 0,
      finalPrice: 50000000,
      reservationAmount: 10000000,
      reservationDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      initialQuotaPercent: 10,
      initialQuotaAmount: 5000000,
      financedBalance: 40000000,
      installmentsCount: 36,
      installmentAmount: 1111111,
      observations: "Suscripción conjunta hermanos Restrepo. Muelle privado autorizado.",
      dataValidated: true,
      validatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      validatedById: advisor.id,
      validationNotes: "Validación de documentos, verificación de cédulas y pago de separación acreditado en Davivienda.",
      advisorId: advisor.id,
      createdById: advisor.id,
    },
  });

  // Generar Contrato de Separación para Cotización 2
  const projClubNautico = COMMERCIAL_PROJECTS.find((p) => p.name === "Club Náutico Monteazul")!;
  await prisma.commercialContract.create({
    data: {
      contractNumber: "CS-2026-0001",
      quoteId: cot2.id,
      status: "VIGENTE",
      date: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      promoterName: MONTEAZUL_PROMOTER.name,
      promoterNit: MONTEAZUL_PROMOTER.nit,
      promoterRegistration: MONTEAZUL_PROMOTER.mercantileRegistration,
      promoterLegalRep: MONTEAZUL_PROMOTER.legalRepresentative,
      promoterRepDoc: MONTEAZUL_PROMOTER.legalRepresentativeDoc,
      promoterAddress: `${MONTEAZUL_PROMOTER.ibagueAddress} / ${MONTEAZUL_PROMOTER.bogotaAddress}`,
      promoterPhone: MONTEAZUL_PROMOTER.phone,
      promoterEmail: MONTEAZUL_PROMOTER.commercialEmail,

      projectName: projClubNautico.legalName,
      projectLocation: projClubNautico.location,
      stage: cot2.stage!,
      block: cot2.block!,
      lotNumber: cot2.lotNumber,
      totalArea: cot2.totalArea,

      optant1Name: cot2.clientName,
      optant1DocType: cot2.clientDocType,
      optant1Doc: cot2.clientDocNumber,
      optant1Participation: cot2.clientParticipation,
      optant1Address: cot2.clientAddress,
      optant1City: cot2.clientCity,
      optant1Phone: cot2.clientPhone,
      optant1Email: cot2.clientEmail,
      optant1CivilStatus: cot2.clientCivilStatus!,
      optant1Bank: cot2.clientBank!,

      hasOptant2: true,
      optant2Name: cot2.secondOptantName,
      optant2DocType: cot2.secondOptantDocType,
      optant2Doc: cot2.secondOptantDocNumber,
      optant2Participation: cot2.secondOptantParticipation,
      optant2Address: cot2.secondOptantAddress,
      optant2City: cot2.secondOptantCity,
      optant2Phone: cot2.secondOptantPhone,
      optant2Email: cot2.secondOptantEmail,
      optant2CivilStatus: cot2.secondOptantCivilStatus,
      optant2Bank: cot2.secondOptantBank,

      totalPrice: cot2.finalPrice,
      totalPriceWords: numberToWordsPesos(cot2.finalPrice),
      reservationAmount: cot2.reservationAmount,
      reservationAmountWords: numberToWordsPesos(cot2.reservationAmount),
      reservationPaymentDate: cot2.reservationDate,
      hasDiscount: false,
      discountAmount: 0,
      initialQuotaPercent: 10,
      initialQuotaAmount: 5000000,
      balanceAmount: cot2.financedBalance,
      balanceAmountWords: numberToWordsPesos(cot2.financedBalance),
      installmentsCount: cot2.installmentsCount,
      authorizedBankAccounts: projClubNautico.authorizedBankAccounts,

      createdById: advisor.id,
    },
  });

  // 3. Cotización 3: Llanos Las Victorias (Emitida)
  await prisma.commercialQuote.create({
    data: {
      consecutive: "COT-2026-0003",
      status: "EMITIDA",
      date: new Date(),
      validityDays: 3,
      projectName: "Llanos Las Victorias",
      stage: "Etapa 1",
      block: "Manzana C",
      lotNumber: "Lote 28",
      totalArea: 100,
      pricePerSquareMeter: 140000,
      totalPrice: 14000000,
      clientName: "Alejandro Morales Torres",
      clientDocType: "CC",
      clientDocNumber: "1018456789",
      clientPhone: "3209871234",
      clientEmail: "alejandro.morales@ejemplo.com",
      clientAddress: "Calle 60 # 6A-20, Ibagué",
      clientCity: "Ibagué, Tolima",
      clientCivilStatus: "Soltero(a)",
      clientBank: "Bancolombia",
      clientParticipation: 100,
      hasDiscount: false,
      discountAmount: 0,
      finalPrice: 14000000,
      reservationAmount: 3000000,
      reservationDate: new Date(),
      initialQuotaPercent: 10,
      initialQuotaAmount: 1400000,
      financedBalance: 11000000,
      installmentsCount: 18,
      installmentAmount: 611111,
      observations: "Programó visita al lote para el próximo fin de semana.",
      advisorId: advisor.id,
      createdById: advisor.id,
    },
  });

  console.log("Commercial Quotes & Contracts seeded successfully!");
}

seedCommercial()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
