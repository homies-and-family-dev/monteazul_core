import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  FILED: "Radicado",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En proceso",
  IN_REVIEW: "En revisión",
  RESUBMITTED: "Reenviada",
  DELIVERED: "Entregado",
  RETURNED: "Devuelto",
  PENDING_CONFIRMATION: "Por confirmar",
  CLOSED: "Cerrado",
};

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const requests = await prisma.request.findMany({
    orderBy: { filedAt: "desc" },
    include: { originArea: true, destinationArea: true, filedBy: true },
  });

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22 }}>Solicitudes</h1>
        <Link
          href="/requests/new"
          style={{
            padding: "8px 16px",
            background: "#111",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          + Radicar solicitud
        </Link>
      </div>

      {requests.length === 0 ? (
        <p>Todavía no hay solicitudes radicadas.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 8 }}>Folio</th>
              <th style={{ padding: 8 }}>Título</th>
              <th style={{ padding: 8 }}>Origen</th>
              <th style={{ padding: 8 }}>Destino</th>
              <th style={{ padding: 8 }}>Estado</th>
              <th style={{ padding: 8 }}>Radicado por</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{r.ticketNumber}</td>
                <td style={{ padding: 8 }}>{r.title}</td>
                <td style={{ padding: 8 }}>{r.originArea.name}</td>
                <td style={{ padding: 8 }}>{r.destinationArea.name}</td>
                <td style={{ padding: 8 }}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </td>
                <td style={{ padding: 8 }}>{r.filedBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
