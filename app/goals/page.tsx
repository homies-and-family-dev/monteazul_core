import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GoalsView from "./goals-view";

export default async function GoalsPage() {
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
  const permissionsList = Array.from(
    new Set(
      currentUser?.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      ) ?? []
    )
  );

  // Perfil Gerencia / Administración General: único perfil con acceso transversal a todas las áreas
  const isGerencia =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia");

  const userAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];
  const userAreaNames = currentUser?.areas.map((a) => a.area.name).join(", ") || "";

  const canAccessGoals =
    isGerencia ||
    permissionsList.includes("goals:view") ||
    permissionsList.includes("goals:manage") ||
    userAreaIds.length > 0;

  // Verificación de acceso al Módulo de Objetivos (Puntos 4, 28 y 29)
  if (!canAccessGoals) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Objetivos
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            La definición y seguimiento de objetivos estratégicos de área está reservada para el personal y directores del área correspondiente o para la Gerencia General.
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

  // REGLA:
  // "el unico perfil que puede ver todas las areas en el paner de objetivos debe ser gerencia"
  // "para que los objetivos se cargue y se visualicen respectivamente por areas"
  const goalsWhere = isGerencia
    ? {}
    : {
        areaId: { in: userAreaIds },
      };

  // Cargar objetivos del sistema con avances y bitácora según el alcance del usuario
  const goals = await prisma.goal.findMany({
    where: goalsWhere,
    include: {
      area: { select: { id: true, name: true, code: true } },
      responsible: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      progressUpdates: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { endDate: "asc" },
  });

  // Todas las áreas activas
  const allActiveAreas = await prisma.area.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Áreas visibles para el usuario en el panel
  const visibleAreas = isGerencia
    ? allActiveAreas
    : allActiveAreas.filter((a) => userAreaIds.includes(a.id));

  // Todos los usuarios activos con sus áreas asignadas para filtrado departamental
  const availableUsers = await prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      email: true,
      areas: {
        select: { areaId: true },
      },
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Directores y gerentes
  const directorsAndManagers = availableUsers.filter((u) =>
    u.roles.some(
      (r) =>
        r.role.name === "Administrador General" ||
        r.role.name === "Gerencia" ||
        r.role.name.includes("Director")
    )
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                {isGerencia ? "Módulo Gerencial Transversal" : `Objetivos Departamentales (${userAreaNames})`}
              </span>
              <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                Sección 29: Objetivos y Metas Operativas
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Alineación Estratégica y Cumplimiento de Objetivos
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {isGerencia
                ? "Supervisión ejecutiva global y transversal de objetivos y metas de todas las áreas de la organización."
                : `Gestión y seguimiento de objetivos específicos correspondientes a su área (${userAreaNames}).`}
            </p>
          </div>
        </div>

        {/* Componente Interactivo de Objetivos */}
        <GoalsView
          initialGoals={goals}
          areas={visibleAreas}
          directorsAndManagers={directorsAndManagers}
          availableUsers={availableUsers}
          currentUserId={session.user.id}
          canManage={true}
          isGerencia={isGerencia}
          userAreaIds={userAreaIds}
        />
      </div>
    </div>
  );
}
