import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

  if (!currentUser) {
    redirect("/login");
  }

  const rolesList = currentUser.roles.map((r) => r.role.name);
  const areasList = currentUser.areas.map((a) => a.area.name);
  const permissionsList = currentUser.roles.flatMap((r) =>
    r.role.permissions.map((p) => p.permission.key)
  );

  const isGerencia =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const isDirector = rolesList.some((r) =>
    r.toLowerCase().includes("director")
  );

  const isMarketingDirector = isDirector && areasList.includes("Marketing");

  const canAccessEquipment =
    isGerencia ||
    permissionsList.includes("marketing:equipment");

  // Verificación de acceso al Módulo Especializado de Marketing (Puntos 32-35)
  if (!canAccessEquipment) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Equipos
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El control de inventario y préstamo de equipos audiovisuales de Marketing requiere el permiso correspondiente en la matriz de roles o pertenecer a la Dirección General.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación izquierdo para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  // Filtro de visibilidad según rol y usuario (Control individual idéntico a solicitudes)
  let loansWhereClause: Prisma.EquipmentLoanWhereInput = {};
  let etiquetaAlcance = "";

  if (isGerencia) {
    // Gerencia / Admin: supervisión transversal de todos los préstamos
    loansWhereClause = {};
    etiquetaAlcance = "Vista Gerencial: Todos los préstamos de la organización";
  } else if (isMarketingDirector) {
    // Director de Marketing: control de todos los préstamos del área
    loansWhereClause = {};
    etiquetaAlcance = "Vista de Dirección: Préstamos y control del área de Marketing";
  } else {
    // Operadores y usuarios individuales: únicamente procesos y préstamos correspondientes a su usuario
    loansWhereClause = {
      OR: [
        { borrowerId: currentUser.id },
        { departureDeliveredSignedById: currentUser.id },
        { departureReceivedSignedById: currentUser.id },
        { returnDeliveredSignedById: currentUser.id },
        { returnReceivedSignedById: currentUser.id },
      ],
    };
    etiquetaAlcance = "Vista Individual: Únicamente préstamos asociados a su usuario";
  }

  // Cargar inventario de equipos (catálogo disponible para todos los autorizados)
  const equipment = await prisma.equipment.findMany({
    orderBy: { code: "asc" },
  });

  // Cargar préstamos con sus relaciones y firmas digitales filtrados por alcance de rol
  const loans = await prisma.equipmentLoan.findMany({
    where: loansWhereClause,
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

  // Usuarios activos seleccionables como custodio / solicitante
  const selectableUsers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Solicitudes Core dirigidas a Marketing (filtradas por alcance individual si es operador)
  const coreRequestsWhere: Prisma.RequestWhereInput = isGerencia || isMarketingDirector
    ? { destinationArea: { name: "Marketing" } }
    : {
        destinationArea: { name: "Marketing" },
        OR: [
          { assignments: { some: { userId: currentUser.id } } },
          { filedById: currentUser.id },
        ],
      };

  const coreRequests = await prisma.request.findMany({
    where: coreRequestsWhere,
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                Módulo Especializado de Marketing
              </span>
              <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                Sección 35: Equipos y Préstamos
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300">
                {etiquetaAlcance}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Control de Inventario y Préstamo de Equipos Audiovisuales
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Gestión de cámaras, drones, ópticas, luces y generación de actas oficiales de entrega (F-MKT-01) y devolución (F-MKT-02).
            </p>
          </div>
        </div>

        {/* Componente Interactivo de Equipos y Préstamos */}
        <EquipmentView
          initialEquipment={equipment}
          initialLoans={loans}
          marketingUsers={selectableUsers}
          coreRequests={coreRequests}
          canManage={isGerencia || isMarketingDirector}
          currentUser={{
            id: session.user.id,
            name: currentUser?.name || session.user.name || "Usuario",
            email: currentUser?.email || session.user.email || "",
          }}
          etiquetaAlcance={etiquetaAlcance}
          isIndividualView={!isGerencia && !isMarketingDirector}
        />
      </div>
    </div>
  );
}
