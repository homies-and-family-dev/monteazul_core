import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EquipmentView from "./equipment-view";

export default async function EquipmentPage() {
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

  const rolesList = currentUser?.roles.map((r) => r.role.name) ?? [];
  const areasList = currentUser?.areas.map((a) => a.area.name) ?? [];
  const permissionsList = Array.from(
    new Set(
      currentUser?.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      ) ?? []
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

  const canAccessEquipment =
    isGeneralAdmin ||
    permissionsList.includes("marketing:equipment") ||
    (isMarketingMember && !isOtherAreaDirector);

  // Verificación de acceso al Módulo Especializado de Marketing (Puntos 32-35)
  if (!canAccessEquipment) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Equipos
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El control de inventario y préstamo de equipos audiovisuales de Marketing está reservado para el personal del área de Marketing y la Dirección General.
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

  // Cargar inventario de equipos
  const equipment = await prisma.equipment.findMany({
    orderBy: { code: "asc" },
  });

  // Cargar préstamos con sus relaciones y firmas digitales
  const loans = await prisma.equipmentLoan.findMany({
    include: {
      borrower: { select: { id: true, name: true, email: true } },
      authorizedBy: { select: { id: true, name: true } },
      departureDeliveredSignedBy: { select: { id: true, name: true, email: true } },
      departureReceivedSignedBy: { select: { id: true, name: true, email: true } },
      returnDeliveredSignedBy: { select: { id: true, name: true, email: true } },
      returnReceivedSignedBy: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      request: { select: { id: true, ticketNumber: true, title: true } },
      items: {
        include: {
          equipment: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Usuarios del área de Marketing
  const marketingUsers = await prisma.user.findMany({
    where: {
      active: true,
      areas: {
        some: {
          area: { name: "Marketing" },
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Solicitudes Core dirigidas a Marketing
  const coreRequests = await prisma.request.findMany({
    where: {
      destinationArea: { name: "Marketing" },
    },
    select: { id: true, ticketNumber: true, title: true },
    orderBy: { filedAt: "desc" },
    take: 30,
  });

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                Módulo Especializado de Marketing
              </span>
              <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                Sección 35: Equipos y Préstamos
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Control de Inventario y Préstamo de Equipos Audiovisuales
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Gestión de cámaras, drones, ópticas, luces y generación de actas oficiales de entrega (F-MKT-01) y devolución (F-MKT-02).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/marketing/calendar"
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-semibold shadow-2xs transition-colors"
            >
              Ir a Calendario de Contenidos →
            </Link>
          </div>
        </div>

        {/* Componente Interactivo de Equipos y Préstamos */}
        <EquipmentView
          initialEquipment={equipment}
          initialLoans={loans}
          marketingUsers={marketingUsers}
          coreRequests={coreRequests}
          canManage={isGeneralAdmin || isMarketingMember}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
