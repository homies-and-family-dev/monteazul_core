import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CalendarView from "./calendar-view";

export default async function MarketingCalendarPage() {
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
  const permissionsList = currentUser.roles.flatMap((r) =>
    r.role.permissions.map((p) => p.permission.key)
  );

  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const canAccessCalendar =
    isGeneralAdmin ||
    permissionsList.includes("marketing:calendar");

  // Validación de acceso al Módulo Especializado de Marketing (Puntos 32-36)
  if (!canAccessCalendar) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Marketing
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El Calendario Editorial de Contenidos y las herramientas operativas especializadas de Marketing están reservadas para el equipo del área de Marketing y la Dirección General.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación izquierdo para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  // Cargar contenidos programados
  const contents = await prisma.marketingContent.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      request: { select: { id: true, ticketNumber: true, title: true } },
    },
    orderBy: { date: "asc" },
  });

  // Operadores de Marketing disponibles para asignación
  const marketingOperators = await prisma.user.findMany({
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

  // Solicitudes Core dirigidas a Marketing para posible vinculación
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
                Sección 36: Calendario de Contenidos
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Calendario Editorial y Planificador de Contenidos
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Planificación visual multicanal, gestión de copies, seguimiento de estados editoriales y vinculación con solicitudes del Core Corporativo.
            </p>
          </div>

          <div className="text-left md:text-right text-xs">
            <span className="text-slate-600 block">Total Programados:</span>
            <span className="font-bold text-blue-950 text-base font-mono">
              {contents.length} publicaciones
            </span>
          </div>
        </div>

        {/* Vista Interactiva del Calendario */}
        <CalendarView
          initialContents={contents}
          marketingOperators={marketingOperators}
          coreRequests={coreRequests}
          canEdit={true}
        />
      </div>
    </div>
  );
}
