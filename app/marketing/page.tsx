import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const isMarketingMember = areasList.includes("Marketing");
  const isOtherAreaDirector =
    rolesList.some((r) => r.toLowerCase().includes("director")) &&
    !areasList.includes("Marketing");

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
          <div>
            <Link
              href="/requests"
              className="inline-block px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              Ir a la Bandeja de Solicitudes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Obtener Área de Marketing
  const marketingArea = await prisma.area.findUnique({
    where: { code: "MKT" },
  });

  // 2. Requerimientos canalizados a Marketing
  const requests = marketingArea
    ? await prisma.request.findMany({
        where: { destinationAreaId: marketingArea.id },
        include: {
          originArea: { select: { name: true, code: true } },
          filedBy: { select: { name: true } },
          assignments: {
            include: { user: { select: { name: true } } },
            orderBy: { date: "desc" },
            take: 1,
          },
          tasks: { select: { id: true, status: true } },
          _count: { select: { comments: true, files: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // 3. Próximas publicaciones del calendario editorial
  const upcomingContents = await prisma.marketingContent.findMany({
    include: {
      assignedTo: { select: { name: true } },
    },
    orderBy: { date: "asc" },
    take: 6,
  });

  // 4. Métricas de equipos y contenidos
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

  const metrics = {
    totalRequests: requests.length,
    activeRequests: requests.filter((r) => r.status !== "CLOSED").length,
    inProgressRequests: requests.filter(
      (r) => r.status === "IN_PROGRESS" || r.status === "IN_REVIEW"
    ).length,
    deliveredRequests: requests.filter(
      (r) => r.status === "DELIVERED" || r.status === "CLOSED"
    ).length,
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
          requests={requests}
          upcomingContents={upcomingContents}
          metrics={metrics}
          userName={currentUser.name}
        />
      </div>
    </div>
  );
}
