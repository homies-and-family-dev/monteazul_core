import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewRequestForm from "./request-form";

export const metadata = {
  title: "Radicar Solicitud — Monte Azul Suite",
};

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Cargar áreas activas
  const areas = await prisma.area.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  // Cargar tipos de solicitud
  const masterTypeRequest = await prisma.masterType.findUnique({
    where: { key: "request_type" },
    include: {
      values: {
        where: { active: true },
        select: { id: true, value: true, areaId: true },
        orderBy: { value: "asc" },
      },
    },
  });

  // Cargar prioridades corporativas
  const masterTypePriority = await prisma.masterType.findUnique({
    where: { key: "priority" },
    include: {
      values: {
        where: { active: true },
        select: { id: true, value: true, areaId: true },
      },
    },
  });

  const requestTypes = masterTypeRequest?.values ?? [];
  const priorities = masterTypePriority?.values ?? [];

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">
            Nueva Solicitud
          </h1>
          <p className="text-sm text-slate-600">
            Complete los datos para radicar una solicitud interáreas dentro de Monte Azul Suite.
          </p>
        </div>

        <NewRequestForm
          areas={areas}
          requestTypes={requestTypes}
          priorities={priorities}
          userEmail={session.user.email ?? ""}
          userName={session.user.name ?? "Usuario"}
        />
      </div>
    </div>
  );
}
