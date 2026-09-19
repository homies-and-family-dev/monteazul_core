import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SidebarShell from "./sidebar-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Si no hay sesión iniciada (ej. en /login), renderizamos directamente el contenedor limpio sin navegación
  if (!session?.user?.id) {
    return <main className="min-h-screen bg-white">{children}</main>;
  }

  // Obtenemos los roles y áreas asignados al usuario en la base de datos
  const [userRoles, userAreas] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    }),
    prisma.userArea.findMany({
      where: { userId: session.user.id },
      include: { area: true },
    }),
  ]);

  const rolesList = userRoles.map((ur) => ur.role.name);
  const areasList = userAreas.map((ua) => ua.area.name);
  const permissionsList = Array.from(
    new Set(
      userRoles.flatMap((ur) =>
        ur.role.permissions.map((p) => p.permission.key)
      )
    )
  );

  // Verificación de capacidades según roles y permisos de vistas
  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const isMarketingMember = areasList.includes("Marketing");
  const isOtherAreaDirector =
    rolesList.some((r) => r.toLowerCase().includes("director")) &&
    !areasList.includes("Marketing");

  // Estrategia y Gerencia:
  // Control estricto por permisos de la matriz de roles configurada en el sistema
  const canAccessManagement =
    isGeneralAdmin ||
    permissionsList.includes("management:view");

  const canAccessGoals =
    isGeneralAdmin ||
    permissionsList.includes("goals:view") ||
    permissionsList.includes("goals:manage");

  const canAccessStrategySection =
    canAccessManagement || canAccessGoals;

  // Configuración y Maestros:
  const canAccessMasters =
    isGeneralAdmin ||
    permissionsList.includes("masters:view") ||
    permissionsList.includes("masters:manage_catalogs") ||
    permissionsList.includes("masters:manage_roles");

  // Capacidades operativas de Marketing:
  // Control estricto por permisos de rol configurados en el sistema (directores y operarios)
  const canAccessMarketingCampaigns =
    isGeneralAdmin ||
    permissionsList.includes("marketing:view");

  const canAccessMarketingCalendar =
    isGeneralAdmin ||
    permissionsList.includes("marketing:calendar");

  const canAccessMarketingEquipment =
    isGeneralAdmin ||
    permissionsList.includes("marketing:equipment");

  const canAccessMarketing =
    canAccessMarketingCampaigns ||
    canAccessMarketingCalendar ||
    canAccessMarketingEquipment;

  const permissions = {
    isGeneralAdmin,
    canAccessManagement,
    canAccessGoals,
    canAccessStrategySection,
    canAccessMasters,
    canAccessMarketing,
    canAccessMarketingCampaigns,
    canAccessMarketingCalendar,
    canAccessMarketingEquipment,
  };

  // Obtenemos los tipos de catálogos maestros para desplegarlos como submenús dinámicos
  const masterTypes = canAccessMasters
    ? await prisma.masterType.findMany({
        orderBy: { name: "asc" },
        select: { id: true, key: true, name: true },
      })
    : [];

  const user = {
    id: session.user.id,
    name: session.user.name || "Usuario",
    email: session.user.email || "",
  };

  return (
    <Suspense fallback={<main className="min-h-screen bg-white">{children}</main>}>
      <SidebarShell
        user={user}
        roles={rolesList}
        areas={areasList}
        permissions={permissions}
        masterTypes={masterTypes}
      >
        {children}
      </SidebarShell>
    </Suspense>
  );
}
