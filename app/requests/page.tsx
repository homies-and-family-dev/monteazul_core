import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestStatus, Prisma } from "@prisma/client";
import { ESTADOS_SOLICITUD } from "@/lib/time-metrics";
import OperatorWorkloadModal from "./operator-workload-modal";

export const metadata = {
  title: "Bandeja de Solicitudes — Monte Azul Suite",
};

const ESTILOS_ESTADO: Record<
  RequestStatus,
  { bg: string; text: string; border: string }
> = {
  FILED: {
    bg: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-300",
  },
  ASSIGNED: {
    bg: "bg-sky-100",
    text: "text-sky-900",
    border: "border-sky-300",
  },
  IN_PROGRESS: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
  },
  IN_REVIEW: {
    bg: "bg-purple-100",
    text: "text-purple-900",
    border: "border-purple-300",
  },
  RESUBMITTED: {
    bg: "bg-cyan-100",
    text: "text-cyan-900",
    border: "border-cyan-300",
  },
  DELIVERED: {
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
  },
  RETURNED: {
    bg: "bg-rose-100",
    text: "text-rose-900",
    border: "border-rose-300",
  },
  PENDING_CONFIRMATION: {
    bg: "bg-orange-100",
    text: "text-orange-900",
    border: "border-orange-300",
  },
  CLOSED: {
    bg: "bg-slate-200",
    text: "text-slate-800",
    border: "border-slate-300",
  },
};

const ESTILOS_PRIORIDAD: Record<string, string> = {
  Baja: "bg-slate-100 text-slate-700 border-slate-300",
  Media: "bg-blue-100 text-blue-900 border-blue-300",
  Alta: "bg-amber-100 text-amber-900 border-amber-300",
  Urgente: "bg-rose-100 text-rose-900 border-rose-300 font-semibold",
};


export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Cargar usuario autenticado con sus roles y áreas asociadas
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

  const isGerencia = currentUser.roles.some(
    (r) => r.role.name === "Administrador General" || r.role.name === "Gerencia"
  );

  const isDirector = currentUser.roles.some(
    (r) =>
      r.role.name === "Director de Área" ||
      r.role.name.toLowerCase().includes("director")
  );

  const userAreaIds = currentUser.areas.map((a) => a.areaId);
  const userAreaNames = currentUser.areas.map((a) => a.area.name);

  // Filtro de visibilidad según rol y área
  let whereClause: Prisma.RequestWhereInput = {};
  let etiquetaAlcance = "";

  if (isGerencia) {
    // Gerencia / Admin: visualización transversal de todas las áreas
    whereClause = {};
    etiquetaAlcance = "Vista Gerencial: Todos los requerimientos de la organización";
  } else if (isDirector && userAreaIds.length > 0) {
    // Directores: todos los requerimientos de su área (como destino u origen) y los que radicó personalmente
    whereClause = {
      OR: [
        { destinationAreaId: { in: userAreaIds } },
        { originAreaId: { in: userAreaIds } },
        { filedById: currentUser.id },
      ],
    };
    etiquetaAlcance = `Vista de Dirección: Requerimientos del área de ${userAreaNames.join(", ")}`;
  } else {
    // Operadores y solicitantes: únicamente requerimientos asignados a su usuario o radicados por él
    whereClause = {
      OR: [
        {
          assignments: {
            some: { userId: currentUser.id },
          },
        },
        { filedById: currentUser.id },
      ],
    };
    etiquetaAlcance = "Vista Operativa: Únicamente requerimientos asignados o radicados por su usuario";
  }

  const requests = await prisma.request.findMany({
    where: whereClause,
    orderBy: { filedAt: "desc" },
    include: {
      originArea: true,
      destinationArea: true,
      filedBy: true,
      assignments: {
        include: { user: true },
        orderBy: { date: "desc" },
        take: 1,
      },
      files: {
        where: { type: "link" },
      },
    },
  });

  const total = requests.length;
  const radicadoCount = requests.filter((r) => r.status === "FILED").length;
  const enProcesoCount = requests.filter(
    (r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED" || r.status === "RESUBMITTED"
  ).length;
  const cerradasCount = requests.filter((r) => r.status === "CLOSED").length;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-950">
              Bandeja de Solicitudes
            </h1>
            <p className="text-xs font-semibold text-blue-900 mt-1">
              {etiquetaAlcance}
            </p>
          </div>
          <Link
            href="/requests/new"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Radicar Solicitud
          </Link>
        </div>

        {/* Tarjetas de indicadores con recuadros azul claro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Total Visibles
            </span>
            <p className="text-2xl font-bold text-blue-950 mt-1">{total}</p>
          </div>
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Radicadas (Por Asignar)
            </span>
            <p className="text-2xl font-bold text-blue-800 mt-1">{radicadoCount}</p>
          </div>
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              En Ejecución
            </span>
            <p className="text-2xl font-bold text-amber-800 mt-1">{enProcesoCount}</p>
          </div>
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Cerradas / Finalizadas
            </span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{cerradasCount}</p>
          </div>
        </div>

        {/* Contenedor de la tabla en recuadro azul claro */}
        <div className="bg-blue-50/40 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          {requests.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white">
              <p className="text-base font-semibold text-slate-800">
                No hay requerimientos en su bandeja
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isGerencia
                  ? "Aún no se han registrado solicitudes en el sistema."
                  : isDirector
                  ? `No hay solicitudes dirigidas o radicadas por el área de ${userAreaNames.join(", ")}.`
                  : "No tiene requerimientos asignados a su usuario ni radicados pendientes."}
              </p>
              <Link
                href="/requests/new"
                className="inline-block mt-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
              >
                Radicar nueva solicitud
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-blue-200 bg-blue-50/80 text-xs font-bold text-blue-950 uppercase tracking-wider">
                    <th className="px-6 py-3.5 w-32">Folio</th>
                    <th className="px-6 py-3.5">Título y Tipo</th>
                    <th className="px-6 py-3.5 w-44">Estado Actual</th>
                    <th className="px-6 py-3.5 w-32">Prioridad</th>
                    <th className="px-6 py-3.5 w-52">Operador Asignado</th>
                    <th className="px-6 py-3.5 w-36 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {requests.map((r) => {
                    const estilo = ESTILOS_ESTADO[r.status] ?? ESTILOS_ESTADO.FILED;
                    const nombreEstado = ESTADOS_SOLICITUD[r.status] ?? r.status;
                    const currentAssignee = r.assignments[0]?.user;
                    const tieneEnlaces = r.files.length > 0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        {/* Folio */}
                        <td className="px-6 py-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                          <Link href={`/requests/${r.id}`} className="hover:underline">
                            {r.ticketNumber}
                          </Link>
                        </td>

                        {/* Título & Tipo */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/requests/${r.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-800 block text-sm leading-snug"
                          >
                            {r.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 font-medium">
                              {r.type}
                            </span>
                            {tieneEnlaces && (
                              <>
                                <span className="text-slate-300 text-xs">•</span>
                                <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  Enlace / Repositorio
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Estado en Español */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${estilo.bg} ${estilo.text} ${estilo.border}`}
                          >
                            {nombreEstado}
                          </span>
                        </td>

                        {/* Prioridad */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {r.priority ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${
                                ESTILOS_PRIORIDAD[r.priority] ??
                                "bg-slate-100 text-slate-700 border-slate-300"
                              }`}
                            >
                              {r.priority}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* Operador Asignado */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {currentAssignee ? (
                            <div className="flex items-center gap-2">
                              <OperatorWorkloadModal
                                operatorId={currentAssignee.id}
                                operatorName={currentAssignee.name}
                              />
                              <span className="font-medium text-slate-900">
                                {currentAssignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Sin asignar</span>
                          )}
                        </td>

                        {/* Botón Ver Detalle */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/requests/${r.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors"
                          >
                            Ver expediente →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
