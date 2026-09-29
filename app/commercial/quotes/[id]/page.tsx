import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteDocumentView from "./quote-document-view";
import { getCommercialProjectByName } from "@/lib/commercial-projects-server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const quote = await prisma.commercialQuote.findUnique({
    where: { id },
    include: {
      advisor: { select: { id: true, name: true, email: true } },
      contract: { select: { id: true, contractNumber: true, status: true } },
    },
  });

  if (!quote) {
    notFound();
  }

  const project = await getCommercialProjectByName(quote.projectName);

  return (
    <div className="p-6">
      <QuoteDocumentView
        quote={quote as any}
        projectLogoUrl={project.logoUrl || null}
      />
    </div>
  );
}
