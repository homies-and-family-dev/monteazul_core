import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { findOrCreateCommercialClient } from "../lib/commercial-clients";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function linkExisting() {
  console.log("Linking existing bookings, quotes, and contracts to unified CommercialClient...");

  // 1. Vincular Cotizaciones
  const quotes = await prisma.commercialQuote.findMany();
  for (const q of quotes) {
    const client = await findOrCreateCommercialClient({
      name: q.clientName,
      docType: q.clientDocType,
      docNumber: q.clientDocNumber,
      phone: q.clientPhone,
      email: q.clientEmail,
      address: q.clientAddress,
      city: q.clientCity,
      civilStatus: q.clientCivilStatus,
      bank: q.clientBank,
      advisorId: q.advisorId,
      createdById: q.createdById,
    });

    await prisma.commercialQuote.update({
      where: { id: q.id },
      data: { clientId: client.id },
    });
    console.log(`Quote ${q.consecutive} linked to client ${client.name} (${client.id})`);
  }

  // 2. Vincular Contratos
  const contracts = await prisma.commercialContract.findMany();
  for (const c of contracts) {
    const client = await findOrCreateCommercialClient({
      name: c.optant1Name,
      docType: c.optant1DocType,
      docNumber: c.optant1Doc,
      phone: c.optant1Phone,
      email: c.optant1Email,
      address: c.optant1Address,
      city: c.optant1City,
      civilStatus: c.optant1CivilStatus,
      bank: c.optant1Bank,
      createdById: c.createdById,
    });

    await prisma.commercialContract.update({
      where: { id: c.id },
      data: { clientId: client.id },
    });
    console.log(`Contract ${c.contractNumber} linked to client ${client.name} (${client.id})`);
  }

  // 3. Vincular Agendamientos
  const bookings = await prisma.commercialBooking.findMany();
  for (const b of bookings) {
    const client = await findOrCreateCommercialClient({
      name: b.clientName,
      phone: b.clientPhone,
      email: b.clientEmail,
      advisorId: b.assignedAdvisorId,
      createdById: b.createdById,
    });

    await prisma.commercialBooking.update({
      where: { id: b.id },
      data: { clientId: client.id },
    });
    console.log(`Booking ${b.id} (${b.clientName}) linked to client ${client.name} (${client.id})`);
  }

  console.log("All existing data successfully linked to unified CommercialClient records!");
}

linkExisting()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
