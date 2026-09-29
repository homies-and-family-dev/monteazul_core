import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CampaignsDashboard from "./campaigns-dashboard";

export const metadata = {
  title: "Tablero y Campañas de Marketing — Monte Azul Suite",
};

export default async function MarketingPage() {
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
  const permissionsList = Array.from(
    new Set(
      currentUser.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      )
    )
  );

  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia");

  const canAccessMarketing =
    isGeneralAdmin ||
    permissionsList.includes("marketing:view");

  // Validación de acceso al Módulo Especializado de Marketing
  if (!canAccessMarketing) {
    if (permissionsList.includes("marketing:equipment")) {
      redirect("/marketing/equipment");
    }
    if (permissionsList.includes("marketing:calendar")) {
      redirect("/marketing/calendar");
    }
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Marketing
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El Tablero de Campañas y las herramientas operativas especializadas de Marketing están reservadas para el equipo del área de Marketing y la Dirección General.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación izquierdo para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  // 1. Obtener Campañas creadas directamente en el Módulo de Marketing
  // (Sin mezclar solicitudes de radicación general, que corresponden exclusivamente a /requests)
  const campaigns = await prisma.marketingCampaign.findMany({
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { contents: true } },
    },
    orderBy: { startDate: "desc" },
  });

  // 2. Próximas publicaciones del calendario editorial
  const upcomingContents = await prisma.marketingContent.findMany({
    include: {
      assignedTo: { select: { name: true } },
    },
    orderBy: { date: "asc" },
    take: 6,
  });

  // 3. Proyectos Comerciales / Inmobiliarios para el selector de campañas
  const commercialProjects = await prisma.commercialProject.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 4. Usuarios de Marketing / Administradores para asignar responsables
  const marketingArea = await prisma.area.findUnique({
    where: { code: "MKT" },
  });

  const availableUsers = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        marketingArea ? { areas: { some: { areaId: marketingArea.id } } } : {},
        { roles: { some: { role: { name: { in: ["Administrador General", "Gerencia"] } } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 5. Métricas de equipos, publicaciones y presupuestos
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalContentsMonth,
    publishedContents,
    totalEquipment,
    availableEquipment,
    activeLoans,
  ] = await Promise.all([
    prisma.marketingContent.count({
      where: { date: { gte: startOfMonth } },
    }),
    prisma.marketingContent.count({
      where: { status: "Publicado" },
    }),
    prisma.equipment.count(),
    prisma.equipment.count({
      where: { status: "Disponible" },
    }),
    prisma.equipmentLoan.count({
      where: { status: { in: ["Solicitado", "Aprobado", "Entregado"] } },
    }),
  ]);

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "Activa" || c.status === "Planificación"
  );
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);

  const metrics = {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    inPlanningCampaigns: campaigns.filter((c) => c.status === "Planificación").length,
    finishedCampaigns: campaigns.filter((c) => c.status === "Finalizada").length,
    totalBudget,
    totalSpent,
    totalContentsMonth,
    publishedContents,
    totalEquipment,
    availableEquipment,
    activeLoans,
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <CampaignsDashboard
          campaigns={campaigns}
          upcomingContents={upcomingContents}
          projects={commercialProjects}
          availableUsers={availableUsers}
          metrics={metrics}
          userName={currentUser.name}
          canManage={canAccessMarketing}
        />
      </div>
    </div>
  );
}
