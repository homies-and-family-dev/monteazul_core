import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteListView from "./quote-list-view";

export const metadata = {
  title: "Cotizaciones y Contratos — Módulo Comercial Monte Azul",
};

export default async function CommercialQuotesPage() {
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
          <h2 className="text-base font-bold text-blue-950">Acceso Restringido al Módulo Comercial</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            La gestión de cotizaciones y contratos del área comercial está reservada para asesores autorizados y la Dirección General.
          </p>
        </div>
      </div>
    );
  }

  // Cargar cotizaciones con sus relaciones
  const quotes = await prisma.commercialQuote.findMany({
    include: {
      advisor: { select: { id: true, name: true } },
      contract: { select: { id: true, contractNumber: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Asesores comerciales disponibles
  const advisors = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Proyectos comerciales disponibles
  const commercialProjects = await prisma.commercialProject.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <QuoteListView
        initialQuotes={quotes as any}
        advisors={advisors}
        currentUserId={session.user.id}
        projects={commercialProjects as any}
      />
    </div>
  );
}
