import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientDirectoryView from "./client-directory-view";

export const metadata = {
  title: "Directorio de Clientes y Trazabilidad — Área Comercial Monte Azul",
};

export default async function CommercialClientsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
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

  if (!currentUser) {
    redirect("/login");
  }

  const rolesList = currentUser.roles.map((r) => r.role.name);
  const areasList = currentUser.areas.map((a) => a.area.name);
  const permissionsList = currentUser.roles.flatMap((r) =>
    r.role.permissions.map((p) => p.permission.key)
  );

  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia");

  const canAccessCommercial =
    isGeneralAdmin ||
    permissionsList.includes("commercial:view") ||
    permissionsList.includes("commercial:quotes") ||
    permissionsList.includes("commercial:schedule");

  if (!canAccessCommercial) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">Acceso Restringido al Directorio de Clientes</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            La información y trazabilidad de clientes está reservada para el equipo comercial y la Dirección General.
          </p>
        </div>
      </div>
    );
  }

  // Cargar clientes con sus relaciones
  const clientsData = await prisma.commercialClient.findMany({
    include: {
      assignedAdvisor: { select: { id: true, name: true } },
      bookings: { select: { id: true, project: true, date: true, status: true } },
      quotes: { select: { id: true, consecutive: true, projectName: true, finalPrice: true, status: true } },
      contracts: { select: { id: true, contractNumber: true, projectName: true, totalPrice: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Mapear métricas por cliente
  const clientList = clientsData.map((c) => {
    const projectsSet = new Set<string>();
    c.bookings.forEach((b) => projectsSet.add(b.project));
    c.quotes.forEach((q) => projectsSet.add(q.projectName));
    c.contracts.forEach((ct) => projectsSet.add(ct.projectName));

    const totalQuoted = c.quotes.reduce((acc, q) => acc + q.finalPrice, 0);
    const totalContracted = c.contracts.reduce((acc, ct) => acc + ct.totalPrice, 0);

    return {
      id: c.id,
      name: c.name,
      docType: c.docType,
      docNumber: c.docNumber,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      civilStatus: c.civilStatus,
      bank: c.bank,
      occupation: c.occupation,
      notes: c.notes,
      createdAt: c.createdAt,
      assignedAdvisor: c.assignedAdvisor,
      bookingsCount: c.bookings.length,
      quotesCount: c.quotes.length,
      contractsCount: c.contracts.length,
      totalQuoted,
      totalContracted,
      projects: Array.from(projectsSet),
    };
  });

  // Asesores comerciales disponibles
  const advisors = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Proyectos comerciales disponibles para filtro
  const commercialProjects = await prisma.commercialProject.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ClientDirectoryView
        initialClients={clientList}
        advisors={advisors}
        currentUserId={session.user.id}
        projects={commercialProjects}
      />
    </div>
  );
}
