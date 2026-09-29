import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { COMMERCIAL_PROJECTS } from "../lib/commercial-projects";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding commercial projects into CommercialProject table...");

  for (const p of COMMERCIAL_PROJECTS) {
    const existing = await prisma.commercialProject.findFirst({
      where: {
        OR: [{ slug: p.id }, { name: p.name }],
      },
    });

    if (existing) {
      console.log(`Project "${p.name}" already exists (id: ${existing.id}). Updating details...`);
      await prisma.commercialProject.update({
        where: { id: existing.id },
        data: {
          slug: p.id,
          name: p.name,
          legalName: p.legalName,
          location: p.location,
          cityDepartment: p.cityDepartment,
          authorizedBankAccounts: p.authorizedBankAccounts,
          defaultPricePerM2: p.defaultPricePerM2,
          stages: p.stages,
          blocks: p.blocks,
          active: true,
        },
      });
    } else {
      console.log(`Creating project "${p.name}"...`);
      await prisma.commercialProject.create({
        data: {
          slug: p.id,
          name: p.name,
          legalName: p.legalName,
          location: p.location,
          cityDepartment: p.cityDepartment,
          authorizedBankAccounts: p.authorizedBankAccounts,
          defaultPricePerM2: p.defaultPricePerM2,
          stages: p.stages,
          blocks: p.blocks,
          description: `Proyecto inmobiliario campestre en ${p.cityDepartment}`,
          active: true,
        },
      });
    }
  }

  const count = await prisma.commercialProject.count();
  console.log(`Successfully seeded! Total projects in database: ${count}`);
}

main()
  .catch((e) => {
    console.error("Error seeding commercial projects:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
