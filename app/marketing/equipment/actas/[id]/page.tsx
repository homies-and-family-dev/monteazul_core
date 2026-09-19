import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ActaDocumentView from "./acta-document-view";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}

export default async function ActaPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const sp = await searchParams;
  const format = (sp.format as "F-MKT-01" | "F-MKT-02") || "F-MKT-01";

  // Obtener roles y áreas del usuario conectado
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
  const permissionsList = Array.from(
    new Set(
      currentUser.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.key)
      )
    )
  );

  const isGeneralAdmin =
    rolesList.includes("Administrador General") ||
    rolesList.includes("Gerencia") ||
    permissionsList.includes("masters:manage_roles");

  const isMarketingMember =
    areasList.includes("Marketing") ||
    permissionsList.includes("marketing:equipment");

  // Buscar préstamo y sus relaciones
  const loan = await prisma.equipmentLoan.findUnique({
    where: { id },
    include: {
      borrower: { select: { id: true, name: true, email: true } },
      authorizedBy: { select: { id: true, name: true, email: true } },
      departureDeliveredSignedBy: { select: { id: true, name: true, email: true } },
      departureReceivedSignedBy: { select: { id: true, name: true, email: true } },
      returnDeliveredSignedBy: { select: { id: true, name: true, email: true } },
      returnReceivedSignedBy: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      request: { select: { id: true, ticketNumber: true, title: true } },
      items: {
        include: {
          equipment: true,
        },
      },
    },
  });

  if (!loan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-slate-900">Acta No Encontrada</h2>
          <p className="text-xs text-slate-600">
            El préstamo o formato de acta solicitado no existe en la base de datos de Monteazul.
          </p>
          <Link
            href="/marketing/equipment"
            className="inline-block px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            Volver a Equipos de Marketing
          </Link>
        </div>
      </div>
    );
  }

  const isBorrower = loan.borrowerId === session.user.id;

  // Control de acceso: Puede ver el acta si es el solicitante, si pertenece a Marketing o si es Administrador General
  if (!isBorrower && !isMarketingMember && !isGeneralAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white rounded-xl border border-red-200 shadow-sm text-center space-y-4">
          <h2 className="text-base font-bold text-red-950">Acceso Denegado al Acta</h2>
          <p className="text-xs text-slate-600">
            No cuenta con permisos para ver ni firmar el acta del préstamo <strong>{loan.folio}</strong>. Solo el solicitante responsable, el personal de Marketing o la Dirección General pueden acceder.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Utilice el panel de navegación izquierdo para acceder a sus módulos autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ActaDocumentView
      loan={loan}
      currentUser={{
        id: session.user.id,
        name: currentUser.name || "Usuario",
        email: currentUser.email || "",
        isGeneralAdmin,
        isMarketingMember,
        isBorrower,
      }}
      initialFormat={format}
    />
  );
}
