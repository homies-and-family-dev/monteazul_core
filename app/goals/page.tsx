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
      roles: { include: { role: true } },
      areas: { include: { area: true } },
    },
  });

  const isGeneralAdmin =
    currentUser?.roles.some(
      (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
    ) ?? false;

  const isAreaDirector =
    currentUser?.roles.some((r) => r.role.name === "Director de Área") ?? false;

  const userDirectorAreaIds = currentUser?.areas.map((a) => a.areaId) ?? [];

  // Verificación de acceso al Módulo de Objetivos (Puntos 4, 28 y 29)
  if (!isGeneralAdmin && !isAreaDirector) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo de Objetivos
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            La definición y seguimiento de objetivos estratégicos gerenciales y de área está reservada exclusivamente para la Gerencia General y las Direcciones de Área.
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

  // Cargar objetivos del sistema
  const goals = await prisma.goal.findMany({
    include: {
      area: { select: { id: true, name: true, code: true } },
      responsible: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      progressUpdates: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { endDate: "asc" },
  });

  // Áreas activas
  const areas = await prisma.area.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Directores y gerentes para asignación
  const directorsAndManagers = await prisma.user.findMany({
    where: {
      active: true,
      roles: {
        some: {
          role: {
            name: { in: ["Administrador General", "Gerencia", "Director de Área"] },
          },
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-700 text-white shadow-xs">
                Módulo Gerencial Transversal
              </span>
              <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                Sección 29: Objetivos y Metas Operativas
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950 pt-2">
              Alineación Estratégica y Cumplimiento de Objetivos
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Supervisión de metas cuantitativas a corto, mediano y largo plazo, medición de indicadores y bitácora de avances.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/management"
              className="px-3.5 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-semibold shadow-2xs transition-colors"
            >
              ← Volver al Tablero de Indicadores
            </Link>
          </div>
        </div>

        {/* Componente Interactivo de Objetivos */}
        <GoalsView
          initialGoals={goals}
          areas={areas}
          directorsAndManagers={directorsAndManagers}
          canManage={true}
          isGeneralAdmin={isGeneralAdmin}
          userDirectorAreaIds={userDirectorAreaIds}
        />
      </div>
    </div>
  );
}
