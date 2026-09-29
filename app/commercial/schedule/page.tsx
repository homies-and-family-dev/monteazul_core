import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CommercialScheduleView from "./commercial-schedule-view";

export const metadata = {
  title: "Agendamiento de Visitas Comerciales — Monte Azul Suite",
};

export default async function CommercialSchedulePage() {
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
    permissionsList.includes("commercial:schedule") ||
    permissionsList.includes("commercial:view");

  if (!canAccessCommercial) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo Comercial
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El Tablero de Agendamiento de Visitas a Terreno y las herramientas operativas de Ventas están reservadas para el equipo comercial y la Dirección General.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación izquierdo para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  // Cargar todas las visitas agendadas con su trazabilidad de cotizaciones y cliente unificado
  const bookings = await prisma.commercialBooking.findMany({
    include: {
      assignedAdvisor: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      quotes: {
        select: {
          id: true,
          consecutive: true,
          status: true,
          finalPrice: true,
          date: true,
          projectName: true,
          lotNumber: true,
          dataValidated: true,
          contract: {
            select: { id: true, contractNumber: true, status: true },
          },
        },
        orderBy: { date: "desc" },
      },
      client: {
        select: {
          id: true,
          docType: true,
          docNumber: true,
          address: true,
          city: true,
          civilStatus: true,
          bank: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // Asesores comerciales disponibles para asignación
  const commercialAdvisors = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        {
          areas: {
            some: {
              area: { name: "Comercial" },
            },
          },
        },
        {
          roles: {
            some: {
              role: { name: { contains: "Comercial" } },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Si no hay usuarios con área comercial explícita todavía, cargar usuarios activos como fallback para asignación
  const availableAdvisors =
    commercialAdvisors.length > 0
      ? commercialAdvisors
      : await prisma.user.findMany({
          where: { active: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 20,
        });

  // Proyectos comerciales activos para la selección y filtro con sus parámetros de precios y etapas
  const projects = await prisma.commercialProject.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      defaultPricePerM2: true,
      stages: true,
      blocks: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <CommercialScheduleView
      initialBookings={bookings}
      advisors={availableAdvisors}
      projects={projects}
      canEdit={true}
    />
  );
}
