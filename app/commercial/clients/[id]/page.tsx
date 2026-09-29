import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClient360 } from "@/lib/commercial-clients";
import Client360View from "./client-360-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDossierPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const clientData = await getClient360(id);

  if (!clientData) {
    notFound();
  }

  const advisors = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Client360View data={clientData} advisors={advisors} />
    </div>
  );
}
