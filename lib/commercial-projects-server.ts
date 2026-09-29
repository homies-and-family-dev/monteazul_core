import { prisma } from "./prisma";
import {
  CommercialProjectInfo,
  COMMERCIAL_PROJECTS,
  getProjectByName,
} from "./commercial-projects";

/**
 * Obtiene los proyectos comerciales desde la base de datos con fallback estático
 */
export async function getCommercialProjects(activeOnly = true): Promise<CommercialProjectInfo[]> {
  try {
    const dbProjects = await prisma.commercialProject.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });

    if (dbProjects.length > 0) {
      return dbProjects.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        legalName: p.legalName,
        location: p.location,
        cityDepartment: p.cityDepartment,
        authorizedBankAccounts: p.authorizedBankAccounts,
        defaultPricePerM2: p.defaultPricePerM2,
        stages: p.stages,
        blocks: p.blocks,
        description: p.description,
        logoUrl: p.logoUrl,
        active: p.active,
      }));
    }
  } catch (error) {
    console.error("Error fetching commercial projects from DB, using fallback:", error);
  }

  return activeOnly ? COMMERCIAL_PROJECTS.filter((p) => p.active !== false) : COMMERCIAL_PROJECTS;
}

/**
 * Busca un proyecto por nombre, razón social o slug desde la base de datos con fallback
 */
export async function getCommercialProjectByName(name: string): Promise<CommercialProjectInfo> {
  const cleanName = (name || "").trim();
  if (!cleanName) {
    return getProjectByName(name);
  }

  try {
    const dbProject = await prisma.commercialProject.findFirst({
      where: {
        OR: [
          { name: { equals: cleanName, mode: "insensitive" } },
          { legalName: { equals: cleanName, mode: "insensitive" } },
          { slug: { equals: cleanName.toLowerCase().replace(/\s+/g, "-"), mode: "insensitive" } },
        ],
      },
    });

    if (dbProject) {
      return {
        id: dbProject.id,
        slug: dbProject.slug,
        name: dbProject.name,
        legalName: dbProject.legalName,
        location: dbProject.location,
        cityDepartment: dbProject.cityDepartment,
        authorizedBankAccounts: dbProject.authorizedBankAccounts,
        defaultPricePerM2: dbProject.defaultPricePerM2,
        stages: dbProject.stages,
        blocks: dbProject.blocks,
        description: dbProject.description,
        logoUrl: dbProject.logoUrl,
        active: dbProject.active,
      };
    }
  } catch (error) {
    console.error("Error finding commercial project in DB:", error);
  }

  return getProjectByName(name);
}
