import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MastersManager from "./masters-manager";
import RolesManager from "./roles-manager";
import UsersDelegationManager from "./users-delegation-manager";

export const metadata = {
  title: "Datos Maestros, Roles y Delegación — Monte Azul Suite",
};

export default async function MastersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; type?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const activeTab = resolvedParams.tab || "catalogs";
  const initialType = resolvedParams.type || "all";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Consulta de usuario con sus roles, permisos y áreas
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

  const userPermissions = Array.from(
    new Set(
      currentUser.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      )
    )
  );

  const isGeneralAdmin =
    currentUser.roles.some(
      (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
    ) || userPermissions.includes("masters:manage_roles");

  const isAreaDirector = currentUser.roles.some(
    (r) => r.role.name === "Director de Área"
  );

  const userAreaIds = currentUser.areas.map((a) => a.areaId);

  const canAccessMasters =
    isGeneralAdmin ||
    isAreaDirector ||
    userPermissions.includes("masters:view") ||
    userPermissions.includes("masters:manage_catalogs");

  // Restricción de acceso general
  if (!canAccessMasters) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">Acceso a Datos Maestros Restringido</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El módulo de administración de maestros, roles y delegación está habilitado exclusivamente para Directores de Área y la Administración General de Monte Azul Suite.
          </p>
          <div>
            <Link
              href="/requests"
              className="inline-block px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              Volver a la Bandeja de Solicitudes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cargar áreas activas
  const areas = await prisma.area.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  // Consultas concurrentes para alimentar las distintas pestañas
  const [masterTypes, masterValues, roles, permissions, users] =
    await Promise.all([
      // 1. Catálogos maestros
      prisma.masterType.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          key: true,
          name: true,
        },
      }),

      // 2. Valores maestros
      prisma.masterValue.findMany({
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          masterType: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
        orderBy: [
          { masterType: { name: "asc" } },
          { value: "asc" },
        ],
      }),

      // 3. Roles con sus permisos y conteo de usuarios
      prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: "asc" },
      }),

      // 4. Catálogo de Permisos del sistema
      prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { name: "asc" }],
      }),

      // 5. Usuarios con sus roles y áreas operativas delegadas
      prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
          areas: {
            include: {
              area: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo de Maestros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">
              Configuración, Maestros y Delegación
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Puntos 24, 25 y 26 del Documento Maestro: Autonomía operativa para catálogos, definición de roles, matriz de vistas permitidas y delegación de miembros a áreas operativas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {isGeneralAdmin
                ? "Administración General y Transversal"
                : "Gestión de Catálogos de su Área"}
            </span>
          </div>
        </div>

        {/* Pestañas de Navegación del Módulo */}
        <div className="flex flex-wrap items-center gap-2 border-b border-blue-200 pb-2">
          <Link
            href="/masters?tab=catalogs"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "catalogs"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50/70 text-blue-900 hover:bg-blue-100 hover:text-blue-950 border border-blue-200/80"
            }`}
          >
            <span>📑 Catálogos y Listas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {masterTypes.length}
            </span>
          </Link>

          <Link
            href="/masters?tab=roles"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "roles"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50/70 text-blue-900 hover:bg-blue-100 hover:text-blue-950 border border-blue-200/80"
            }`}
          >
            <span>🛡️ Roles y Vistas Permitidas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {roles.length}
            </span>
          </Link>

          <Link
            href="/masters?tab=users"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50/70 text-blue-900 hover:bg-blue-100 hover:text-blue-950 border border-blue-200/80"
            }`}
          >
            <span>👥 Usuarios y Delegación</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {users.length}
            </span>
          </Link>
        </div>

        {/* Contenido según la pestaña activa */}
        {activeTab === "catalogs" && (
          <MastersManager
            masterTypes={masterTypes}
            masterValues={masterValues}
            areas={areas}
            isGeneralAdmin={isGeneralAdmin}
            isAreaDirector={isAreaDirector}
            userAreaIds={userAreaIds}
            initialType={initialType}
          />
        )}

        {activeTab === "roles" && (
          <RolesManager
            roles={roles}
            permissions={permissions}
            isGeneralAdmin={isGeneralAdmin}
          />
        )}

        {activeTab === "users" && (
          <UsersDelegationManager
            users={users}
            roles={roles.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
            }))}
            areas={areas}
            isGeneralAdmin={isGeneralAdmin}
          />
        )}
      </div>
    </div>
  );
}
