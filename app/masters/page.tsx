import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MastersManager from "./masters-manager";

export const metadata = {
  title: "Datos Maestros y Parámetros — Monte Azul Suite",
};

export default async function MastersPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialType = resolvedParams.type || "all";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Consulta de usuario con sus roles y áreas
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { include: { role: true } },
      areas: { include: { area: true } },
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isGeneralAdmin = currentUser.roles.some(
    (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
  );

  const isAreaDirector = currentUser.roles.some(
    (r) => r.role.name === "Director de Área"
  );

  const userAreaIds = currentUser.areas.map((a) => a.areaId);

  // Restricción de acceso para usuarios que no sean directores ni administradores
  if (!isGeneralAdmin && !isAreaDirector) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">Acceso a Datos Maestros Restringido</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            El módulo de administración de maestros y catálogos está habilitado exclusivamente para Directores de Área y la Administración General de Monte Azul Suite.
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

  // Cargar catálogos maestros
  const masterTypes = await prisma.masterType.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
    },
  });

  // Cargar valores maestros con relaciones
  const masterValues = await prisma.masterValue.findMany({
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
  });

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

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo de Maestros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">
              Datos Maestros y Parámetros
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Puntos 24 y 25 del Documento Maestro: Autonomía operativa para configurar listas, tipos de solicitud y prioridades sin recurrir a desarrollo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {isGeneralAdmin
                ? "Gestión Corporativa y de Todas las Áreas"
                : "Gestión de Catálogos de su Área"}
            </span>
          </div>
        </div>

        {/* Administrador Interactivo de Maestros */}
        <MastersManager
          masterTypes={masterTypes}
          masterValues={masterValues}
          areas={areas}
          isGeneralAdmin={isGeneralAdmin}
          isAreaDirector={isAreaDirector}
          userAreaIds={userAreaIds}
          initialType={initialType}
        />
      </div>
    </div>
  );
}
