"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/number-to-words";
import { COMMERCIAL_PROJECTS } from "@/lib/commercial-projects";
import { updateContractStatus } from "../quotes/actions";

export interface ContractItem {
  id: string;
  contractNumber: string;
  status: "VIGENTE" | "FIRMADO" | "LEGALIZADO" | "DESISTIDO" | "ANULADO";
  date: Date | string;
  projectName: string;
  projectLocation: string;
  stage: string;
  block: string;
  lotNumber: string;
  totalArea: number;
  optant1Name: string;
  optant1Doc: string;
  optant1Participation: number;
  optant1Address: string;
  optant1City: string;
  optant1Phone: string;
  optant1Email: string;
  optant1CivilStatus: string;
  optant1Bank: string;
  hasOptant2: boolean;
  optant2Name: string | null;
  optant2Doc: string | null;
  optant2Participation: number | null;
  optant2Address: string | null;
  optant2City: string | null;
  optant2Phone: string | null;
  optant2Email: string | null;
  optant2CivilStatus: string | null;
  optant2Bank: string | null;
  totalPrice: number;
  totalPriceWords: string | null;
  reservationAmount: number;
  reservationAmountWords: string | null;
  balanceAmount: number;
  balanceAmountWords: string | null;
  installmentsCount: number;
  authorizedBankAccounts: string;
  isSigned: boolean;
  signedAt: Date | string | null;
  quote: {
    id: string;
    consecutive: string;
    finalPrice: number;
    advisor: { id: string; name: string } | null;
  };
}

interface Props {
  initialContracts: ContractItem[];
}

export default function ContractListView({ initialContracts }: Props) {
  const [contracts, setContracts] = useState<ContractItem[]>(initialContracts);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContracts = contracts.filter((c) => {
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
    if (filterProject !== "ALL" && !c.projectName.toLowerCase().includes(filterProject.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = c.contractNumber.toLowerCase().includes(q);
      const matchOptant = c.optant1Name.toLowerCase().includes(q);
      const matchDoc = c.optant1Doc.toLowerCase().includes(q);
      const matchQuote = c.quote.consecutive.toLowerCase().includes(q);
      if (!matchNum && !matchOptant && !matchDoc && !matchQuote) return false;
    }
    return true;
  });

  const totalContracts = contracts.length;
  const totalSeparaciones = contracts.reduce((acc, c) => acc + c.reservationAmount, 0);
  const totalComprometido = contracts.reduce((acc, c) => acc + c.totalPrice, 0);

  const handleStatusChange = async (
    contractId: string,
    newStatus: "VIGENTE" | "FIRMADO" | "LEGALIZADO" | "DESISTIDO" | "ANULADO"
  ) => {
    const res = await updateContractStatus(contractId, newStatus);
    if (res.success) {
      setContracts((prev) =>
        prev.map((c) =>
          c.id === contractId
            ? { ...c, status: newStatus, isSigned: newStatus === "FIRMADO" || newStatus === "LEGALIZADO" }
            : c
        )
      );
    } else {
      alert("Error al actualizar estado del contrato.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Contratos Oficiales
            </span>
            <span className="text-xs text-slate-500">Módulo Comercial</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Contratos de Separación Oficiales
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Registro de contratos generados tras la validación de cotizaciones, con asignación jurídica de optantes, cuentas y cláusulas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/commercial/quotes"
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cotización / Validar
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Contratos Generados
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalContracts}</p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
            Derivados de cotizaciones validadas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Total Separaciones Recaudadas
          </span>
          <p className="text-2xl font-bold text-emerald-950 mt-1 truncate">
            {formatCurrency(totalSeparaciones)}
          </p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">
            Reserva efectiva en cuentas Monteazul
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Valor Total de Negocios
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1 truncate">
            {formatCurrency(totalComprometido)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Valor final pactado en inmuebles
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto overflow-x-auto">
          {["ALL", "VIGENTE", "FIRMADO", "LEGALIZADO", "DESISTIDO"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "ALL" ? "Todos" : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
          >
            <option value="ALL">Todos los Proyectos</option>
            {COMMERCIAL_PROJECTS.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar contrato, optante o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-blue-600"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabla de Contratos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay contratos registrados</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Los contratos de separación se generan automáticamente cuando valida una cotización en el módulo comercial.
            </p>
            <Link
              href="/commercial/quotes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Ir a Cotizaciones
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Contrato / Fecha</th>
                  <th className="px-4 py-3">Optante(s) Comprador(es)</th>
                  <th className="px-4 py-3">Proyecto / Lote</th>
                  <th className="px-4 py-3 text-right">Separación</th>
                  <th className="px-4 py-3 text-right">Precio Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{c.contractNumber}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(c.date).toLocaleDateString("es-CO")}
                      </div>
                      <div className="text-[10px] text-blue-700 font-medium">
                        Cot: {c.quote.consecutive}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {c.optant1Name} ({c.optant1Participation}%)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        CC {c.optant1Doc} · {c.optant1City}
                      </div>
                      {c.hasOptant2 && (
                        <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                          + {c.optant2Name} ({c.optant2Participation}%)
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-blue-950">{c.projectName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.lotNumber} ({c.stage} - {c.block}) · {c.totalArea} m²
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-emerald-800">
                        {formatCurrency(c.reservationAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400">Pago de separación</div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(c.totalPrice)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Saldo: {formatCurrency(c.balanceAmount)} ({c.installmentsCount} cuotas)
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value as any)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${
                          c.status === "FIRMADO" || c.status === "LEGALIZADO"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : c.status === "DESISTIDO"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-blue-100 text-blue-800 border-blue-300"
                        }`}
                      >
                        <option value="VIGENTE">Vigente</option>
                        <option value="FIRMADO">Firmado</option>
                        <option value="LEGALIZADO">Legalizado</option>
                        <option value="DESISTIDO">Desistido</option>
                        <option value="ANULADO">Anulado</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        href={`/commercial/contracts/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver e Imprimir Contrato
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
