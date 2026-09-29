import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContractDocumentView from "./contract-document-view";
import { getCommercialProjectByName } from "@/lib/commercial-projects-server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const contract = await prisma.commercialContract.findUnique({
    where: { id },
    include: {
      quote: {
        select: {
          id: true,
          consecutive: true,
          finalPrice: true,
          advisor: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!contract) {
    notFound();
  }

  // Cargar proyecto para obtener su logo personalizado
  const project = await getCommercialProjectByName(contract.projectName);

  return (
    <div className="p-6">
      <ContractDocumentView
        contract={contract as any}
        projectLogoUrl={project.logoUrl || null}
      />
    </div>
  );
}
