import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/number-to-words";

export const metadata = {
  title: "Área Comercial — Monte Azul Suite",
};

export default async function CommercialHubPage() {
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
    rolesList.includes("Gerencia");

  const canAccessCommercial =
    isGeneralAdmin ||
    permissionsList.includes("commercial:view") ||
    permissionsList.includes("commercial:schedule") ||
    permissionsList.includes("commercial:quotes");

  if (!canAccessCommercial) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-blue-950">
            Acceso Restringido al Módulo Comercial
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Su rol actual no cuenta con permisos para acceder al Área Comercial. Si requiere acceso, solicite la asignación del permiso en la matriz de roles a la Dirección General.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  // Métricas del área comercial
  const [clientsCount, quotesCount, contractedQuotesCount, contractsCount, bookingsCount] =
    await Promise.all([
      prisma.commercialClient.count(),
      prisma.commercialQuote.count(),
      prisma.commercialQuote.count({ where: { status: "CONTRATADA" } }),
      prisma.commercialContract.count(),
      prisma.commercialBooking.count(),
    ]);

  // Recientes cotizaciones
  const recentQuotes = await prisma.commercialQuote.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      contract: { select: { id: true, contractNumber: true } },
    },
  });

  // Próximas visitas agendadas
  const upcomingBookings = await prisma.commercialBooking.findMany({
    take: 4,
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  // Clientes recientes
  const recentClients = await prisma.commercialClient.findMany({
    take: 4,
    orderBy: { updatedAt: "desc" },
    include: {
      bookings: { select: { id: true } },
      quotes: { select: { id: true } },
      contracts: { select: { id: true } },
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Área Comercial Monteazul
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Gestión Comercial y Proceso Unificado
          </h1>
          <p className="text-xs md:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
            Directorio unificado de clientes con trazabilidad 360°, emisión de cotizaciones, validación de prospectos, generación de contratos de separación y agendamiento en terreno.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/commercial/clients"
            className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Directorio Clientes ({clientsCount})
          </Link>
          <Link
            href="/commercial/quotes"
            className="px-4 py-2.5 rounded-xl bg-blue-700/80 hover:bg-blue-700 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Cotizaciones
          </Link>
          <Link
            href="/commercial/schedule"
            className="px-4 py-2.5 rounded-xl bg-blue-700/60 hover:bg-blue-700 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Visitas
          </Link>
        </div>
      </div>

      {/* Módulos Principales del Área Comercial (4 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Tarjeta 1: Directorio Unificado de Clientes */}
        <Link
          href="/commercial/clients"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Base Unificada
            </span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
              Directorio de Clientes
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
              Expedientes 360° con trazabilidad centralizada de visitas, cotizaciones y contratos.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{clientsCount} clientes</span>
            <span className="text-blue-700 group-hover:translate-x-1 transition-transform">Ver directorio →</span>
          </div>
        </Link>

        {/* Tarjeta 2: Cotizaciones */}
        <Link
          href="/commercial/quotes"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Paso 1 del Proceso
            </span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
              Cotizaciones Comerciales
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
              Emisión de ofertas para lotes, cálculo de cuotas, descuentos y formatos de venta.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{quotesCount} cotizaciones</span>
            <span className="text-blue-700 group-hover:translate-x-1 transition-transform">Ver flujo →</span>
          </div>
        </Link>

        {/* Tarjeta 3: Contratos de Separación */}
        <Link
          href="/commercial/contracts"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Paso 2 del Proceso
            </span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
              Contratos de Separación
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
              Formalización legal tras validar optantes y separación. Cláusulas por proyecto.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{contractsCount} contratos</span>
            <span className="text-emerald-700 group-hover:translate-x-1 transition-transform">Ver contratos →</span>
          </div>
        </Link>

        {/* Tarjeta 4: Agendamiento de Visitas */}
        <Link
          href="/commercial/schedule"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              Operación en Terreno
            </span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
              Agendamiento de Visitas
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
              Programación de clientes a proyectos, asignación de asesores y logística.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{bookingsCount} visitas</span>
            <span className="text-indigo-700 group-hover:translate-x-1 transition-transform">Ver agenda →</span>
          </div>
        </Link>
      </div>

      {/* Bloque Inferior: Clientes Recientes y Últimas Cotizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes Recientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Clientes con Actividad Reciente
            </h3>
            <Link
              href="/commercial/clients"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Ver todos ({clientsCount}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClients.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <Link
                    href={`/commercial/clients/${c.id}`}
                    className="font-bold text-slate-900 hover:text-blue-700"
                  >
                    {c.name}
                  </Link>
                  <div className="text-[11px] text-slate-500">
                    {c.phone} {c.email ? `· ${c.email}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-slate-500">
                    {c.bookings.length} Vis · {c.quotes.length} Cot · {c.contracts.length} Con
                  </div>
                  <Link
                    href={`/commercial/clients/${c.id}`}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px]"
                  >
                    360°
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recientes Cotizaciones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Cotizaciones Recientes
            </h3>
            <Link
              href="/commercial/quotes"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Ver todas ({quotesCount}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentQuotes.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{q.consecutive}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-blue-950">{q.projectName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cliente: {q.clientName} · {q.lotNumber} ({q.totalArea} m²)
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-900">{formatCurrency(q.finalPrice)}</div>
                  {q.contract ? (
                    <span className="text-[10px] font-bold text-emerald-700">
                      {q.contract.contractNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-blue-600">
                      Emitida
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
