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
      include: { role: true },
    }),
    prisma.userArea.findMany({
      where: { userId: session.user.id },
      include: { area: true },
    }),
  ]);

  const rolesList = userRoles.map((ur) => ur.role.name);
  const areasList = userAreas.map((ua) => ua.area.name);

  // Verificación de capacidades según roles
  const isGeneralAdmin =
    rolesList.includes("Administrador General") || rolesList.includes("Gerencia");

  const isAreaDirector = rolesList.includes("Director de Área");

  const isMarketingMember = areasList.includes("Marketing");

  const canAccessMasters = isGeneralAdmin || isAreaDirector;

  const permissions = {
    isGeneralAdmin,
    canAccessManagement: isGeneralAdmin || isAreaDirector,
    canAccessMasters,
    canAccessMarketing: isGeneralAdmin || isMarketingMember,
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
