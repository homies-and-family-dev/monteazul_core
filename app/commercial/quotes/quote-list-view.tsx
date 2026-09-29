"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createCommercialQuote,
  validateAndConvertToContract,
  deleteCommercialQuote,
  QuoteFormData,
  ValidationAndContractPayload,
} from "./actions";
import { COMMERCIAL_PROJECTS } from "@/lib/commercial-projects";
import { formatCurrency } from "@/lib/number-to-words";

export interface QuoteItem {
  id: string;
  consecutive: string;
  status: string;
  date: Date | string;
  validityDays: number;
  projectName: string;
  stage: string | null;
  block: string | null;
  lotNumber: string;
  totalArea: number;
  pricePerSquareMeter: number;
  totalPrice: number;
  clientName: string;
  clientDocType: string;
  clientDocNumber: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientCivilStatus: string | null;
  clientBank: string | null;
  clientParticipation: number;
  hasSecondOptant: boolean;
  secondOptantName: string | null;
  secondOptantDocType: string | null;
  secondOptantDocNumber: string | null;
  secondOptantPhone: string | null;
  secondOptantEmail: string | null;
  secondOptantAddress: string | null;
  secondOptantCity: string | null;
  secondOptantCivilStatus: string | null;
  secondOptantBank: string | null;
  secondOptantParticipation: number | null;
  hasDiscount: boolean;
  discountAmount: number;
  discountDescription: string | null;
  finalPrice: number;
  reservationAmount: number;
  reservationDate: Date | string | null;
  initialQuotaPercent: number;
  initialQuotaAmount: number;
  financedBalance: number;
  installmentsCount: number;
  installmentAmount: number;
  observations: string | null;
  dataValidated: boolean;
  validatedAt: Date | string | null;
  advisor: { id: string; name: string } | null;
  contract: { id: string; contractNumber: string; status: string } | null;
}

interface Props {
  initialQuotes: QuoteItem[];
  advisors: Array<{ id: string; name: string; email: string }>;
  currentUserId: string;
  projects?: Array<{
    id: string;
    slug?: string;
    name: string;
    legalName: string;
    location: string;
    cityDepartment: string;
    authorizedBankAccounts: string;
    defaultPricePerM2: number;
    stages: string[];
    blocks: string[];
  }>;
}

const CIVIL_STATUS_OPTIONS = [
  "Soltero(a)",
  "Casado(a)",
  "Unión Libre",
  "Divorciado(a)",
  "Viudo(a)",
];

const DOC_TYPES = ["CC", "CE", "NIT", "Pasaporte"];

export default function QuoteListView({ initialQuotes, advisors, currentUserId, projects }: Props) {
  const router = useRouter();
  const projectList = projects && projects.length > 0 ? projects : COMMERCIAL_PROJECTS;
  const defaultProj = projectList[0] || COMMERCIAL_PROJECTS[0];

  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes);
  const [filterTab, setFilterTab] = useState<"ALL" | "EMITIDA" | "EN_VALIDACION" | "CONTRATADA">("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Crear Cotización
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [formData, setFormData] = useState<QuoteFormData>({
    projectName: defaultProj.name,
    stage: defaultProj.stages?.[0] || "Etapa 1",
    block: defaultProj.blocks?.[0] || "Manzana A",
    lotNumber: "Lote 1",
    totalArea: 100,
    pricePerSquareMeter: defaultProj.defaultPricePerM2,
    clientName: "",
    clientDocType: "CC",
    clientDocNumber: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    clientCity: "Colombia",
    clientCivilStatus: "Soltero(a)",
    clientBank: "",
    clientParticipation: 100,
    hasSecondOptant: false,
    secondOptantName: "",
    secondOptantDocType: "CC",
    secondOptantDocNumber: "",
    secondOptantPhone: "",
    secondOptantEmail: "",
    secondOptantAddress: "",
    secondOptantCity: "Colombia",
    secondOptantCivilStatus: "Soltero(a)",
    secondOptantBank: "",
    secondOptantParticipation: 0,
    hasDiscount: false,
    discountAmount: 0,
    discountDescription: "",
    reservationAmount: 5000000,
    reservationDate: new Date().toISOString().split("T")[0],
    initialQuotaPercent: 10,
    installmentsCount: 12,
    observations: "",
    advisorId: currentUserId,
  });

  // Modal Validar y Pasar a Contrato
  const [validatingQuote, setValidatingQuote] = useState<QuoteItem | null>(null);
  const [validationData, setValidationData] = useState<ValidationAndContractPayload | null>(null);
  const [validationSubmitting, setValidationSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Cálculos reactivos de la nueva cotización
  const calcTotalArea = Math.max(0, Number(formData.totalArea) || 0);
  const calcPricePerM2 = Math.max(0, Number(formData.pricePerSquareMeter) || 0);
  const calcTotalPrice = Math.round(calcTotalArea * calcPricePerM2);
  const calcDiscount = formData.hasDiscount ? Math.max(0, Number(formData.discountAmount) || 0) : 0;
  const calcFinalPrice = Math.max(0, calcTotalPrice - calcDiscount);
  const calcReservation = Math.max(0, Number(formData.reservationAmount) || 0);
  const calcInitialQuota = Math.round(calcFinalPrice * (Number(formData.initialQuotaPercent || 10) / 100));
  const calcBalance = Math.max(0, calcFinalPrice - calcReservation);
  const calcInstallments = Math.max(1, Number(formData.installmentsCount) || 12);
  const calcMonthlyQuota = Math.round(calcBalance / calcInstallments);

  // Filtrado de la lista
  const filteredQuotes = quotes.filter((q) => {
    if (filterTab !== "ALL") {
      if (filterTab === "CONTRATADA" && q.status !== "CONTRATADA") return false;
      if (filterTab === "EMITIDA" && q.status !== "EMITIDA") return false;
      if (filterTab === "EN_VALIDACION" && q.status !== "EN_VALIDACION") return false;
    }
    if (filterProject !== "ALL" && q.projectName !== filterProject) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchClient = q.clientName.toLowerCase().includes(query);
      const matchDoc = q.clientDocNumber.toLowerCase().includes(query);
      const matchConsecutive = q.consecutive.toLowerCase().includes(query);
      const matchLot = q.lotNumber.toLowerCase().includes(query);
      if (!matchClient && !matchDoc && !matchConsecutive && !matchLot) return false;
    }
    return true;
  });

  // Estadísticas rápidas
  const totalCount = quotes.length;
  const emittedCount = quotes.filter((q) => q.status === "EMITIDA").length;
  const contractedCount = quotes.filter((q) => q.status === "CONTRATADA").length;
  const totalCotizado = quotes.reduce((acc, q) => acc + q.finalPrice, 0);

  // Manejador apertura de validación
  const openValidationModal = (quote: QuoteItem) => {
    setValidatingQuote(quote);
    setValidationError("");
    setValidationData({
      clientName: quote.clientName,
      clientDocType: quote.clientDocType || "CC",
      clientDocNumber: quote.clientDocNumber,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress || "",
      clientCity: quote.clientCity || "Colombia",
      clientCivilStatus: quote.clientCivilStatus || "Soltero(a)",
      clientBank: quote.clientBank || "Bancolombia",
      clientParticipation: quote.clientParticipation || (quote.hasSecondOptant ? 50 : 100),

      hasSecondOptant: quote.hasSecondOptant,
      secondOptantName: quote.secondOptantName || "",
      secondOptantDocType: quote.secondOptantDocType || "CC",
      secondOptantDocNumber: quote.secondOptantDocNumber || "",
      secondOptantPhone: quote.secondOptantPhone || "",
      secondOptantEmail: quote.secondOptantEmail || "",
      secondOptantAddress: quote.secondOptantAddress || quote.clientAddress || "",
      secondOptantCity: quote.secondOptantCity || quote.clientCity || "Colombia",
      secondOptantCivilStatus: quote.secondOptantCivilStatus || "Soltero(a)",
      secondOptantBank: quote.secondOptantBank || "Bancolombia",
      secondOptantParticipation: quote.secondOptantParticipation || (quote.hasSecondOptant ? 50 : 0),

      stage: quote.stage || "Etapa 1",
      block: quote.block || "Manzana A",
      lotNumber: quote.lotNumber,
      totalArea: quote.totalArea,
      pricePerSquareMeter: quote.pricePerSquareMeter,
      reservationAmount: quote.reservationAmount,
      reservationDate: quote.reservationDate
        ? new Date(quote.reservationDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      installmentsCount: quote.installmentsCount || 12,
      validationNotes: "Datos verificados con el cliente y comprobante de separación confirmado.",
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError("");

    if (!formData.clientName.trim() || !formData.clientDocNumber.trim() || !formData.clientPhone.trim()) {
      setCreateError("Debe completar los campos obligatorios del cliente (Nombre, Cédula/NIT y Teléfono).");
      setCreateSubmitting(false);
      return;
    }

    const res = await createCommercialQuote(formData);
    setCreateSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || "Ocurrió un error al guardar la cotización.");
      return;
    }

    setIsCreateModalOpen(false);
    router.refresh();
  };

  const handleValidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingQuote || !validationData) return;
    setValidationSubmitting(true);
    setValidationError("");

    // Verificaciones estrictas
    if (!validationData.clientCivilStatus) {
      setValidationError("El estado civil del titular es obligatorio para el contrato.");
      setValidationSubmitting(false);
      return;
    }
    if (!validationData.clientBank) {
      setValidationError("La cuenta / entidad bancaria del titular es obligatoria.");
      setValidationSubmitting(false);
      return;
    }
    if (validationData.hasSecondOptant) {
      if (!validationData.secondOptantName?.trim() || !validationData.secondOptantDocNumber?.trim()) {
        setValidationError("Complete nombre y documento de identificación del segundo optante.");
        setValidationSubmitting(false);
        return;
      }
      const sum = Number(validationData.clientParticipation) + Number(validationData.secondOptantParticipation);
      if (sum !== 100) {
        setValidationError(`La suma de participaciones debe dar 100% (actual: ${sum}%).`);
        setValidationSubmitting(false);
        return;
      }
    }

    const res = await validateAndConvertToContract(validatingQuote.id, validationData);
    setValidationSubmitting(false);

    if (!res.success) {
      setValidationError(res.error || "Error al procesar la conversión a contrato.");
      return;
    }

    setValidatingQuote(null);
    router.push(`/commercial/contracts/${res.contractId}`);
  };

  const handleDelete = async (quoteId: string) => {
    if (!confirm("¿Está seguro de eliminar esta cotización?")) return;
    const res = await deleteCommercialQuote(quoteId);
    if (res.success) {
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      router.refresh();
    } else {
      alert(res.error || "No se pudo eliminar.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra superior y estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              Proceso Integrado
            </span>
            <span className="text-xs text-slate-500">Módulo Comercial</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Cotizaciones y Conversión a Contratos
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Flujo comercial unificado: Cotice inmuebles, valide los datos legales del cliente y convierta a Contrato de Separación oficial con un solo clic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/commercial/contracts"
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver Contratos ({contractedCount})
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cotización
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Cotizaciones
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Registradas en el sistema</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Emitidas / Vigentes
          </span>
          <p className="text-2xl font-bold text-blue-900 mt-1">{emittedCount}</p>
          <span className="text-[11px] text-blue-700/80 mt-0.5 block">Listas para validación</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Contratos Generados
          </span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{contractedCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-0.5 block">Separaciones oficiales</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Volumen Total Cotizado
          </span>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate" title={formatCurrency(totalCotizado)}>
            {formatCurrency(totalCotizado)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Valor en proyectos Monteazul</span>
        </div>
      </div>

      {/* Controles de Filtro y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs de Estado */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterTab === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => setFilterTab("EMITIDA")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterTab === "EMITIDA"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Emitidas ({emittedCount})
            </button>
            <button
              onClick={() => setFilterTab("CONTRATADA")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterTab === "CONTRATADA"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Convertidas a Contrato ({contractedCount})
            </button>
          </div>

          {/* Filtro por Proyecto y Búsqueda */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-blue-600"
            >
              <option value="ALL">Todos los Proyectos</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Buscar cliente, cédula o lote..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-900"
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
      </div>

      {/* Lista de Cotizaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron cotizaciones</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aún no hay cotizaciones que coincidan con los filtros aplicados. Puede generar una nueva cotización comercial.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Crear Primera Cotización
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Consecutivo / Fecha</th>
                  <th className="px-4 py-3">Cliente / Titular</th>
                  <th className="px-4 py-3">Proyecto e Inmueble</th>
                  <th className="px-4 py-3 text-right">Valor Final</th>
                  <th className="px-4 py-3 text-right">Separación / Cuota</th>
                  <th className="px-4 py-3 text-center">Estado del Proceso</th>
                  <th className="px-4 py-3 text-right">Acciones Comerciales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => {
                  const isContracted = q.status === "CONTRATADA" && q.contract;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{q.consecutive}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(q.date).toLocaleDateString("es-CO")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{q.clientName}</div>
                        <div className="text-[11px] text-slate-500">
                          {q.clientDocType} {q.clientDocNumber} · {q.clientPhone}
                        </div>
                        {q.hasSecondOptant && (
                          <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                            + Co-titular: {q.secondOptantName}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-blue-900">{q.projectName}</div>
                        <div className="text-[11px] text-slate-500">
                          {q.lotNumber} ({q.stage || "Etapa 1"} - {q.block || "Manzana A"}) · {q.totalArea} m²
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(q.finalPrice)}</div>
                        {q.hasDiscount && (
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            Desc: -{formatCurrency(q.discountAmount)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-emerald-800">
                          Sep: {formatCurrency(q.reservationAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {q.installmentsCount} cuotas de {formatCurrency(q.installmentAmount)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {isContracted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Contratada ({q.contract?.contractNumber})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Emitida (Cotización)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-2">
                        {/* Ver Documento Cotización */}
                        <Link
                          href={`/commercial/quotes/${q.id}`}
                          title="Ver e imprimir PDF de la cotización"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Cotización
                        </Link>

                        {/* Si ya está contratada, botón directo al contrato */}
                        {isContracted ? (
                          <Link
                            href={`/commercial/contracts/${q.contract?.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ver Contrato
                          </Link>
                        ) : (
                          /* Botón de validación y pase a contrato */
                          <button
                            onClick={() => openValidationModal(q)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Validar y Pasar a Contrato
                          </button>
                        )}

                        {!isContracted && (
                          <button
                            onClick={() => handleDelete(q.id)}
                            title="Eliminar cotización"
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CREAR NUEVA COTIZACIÓN COMERCIAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Área Comercial Monteazul
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Generar Nueva Cotización Comercial
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido con scroll */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {createError}
                </div>
              )}

              {/* SECCIÓN 1: PROYECTO E INMUEBLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                  Datos del Proyecto e Inmueble
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Proyecto *
                    </label>
                    <select
                      value={formData.projectName}
                      onChange={(e) => {
                        const proj = projectList.find((p) => p.name === e.target.value);
                        setFormData({
                          ...formData,
                          projectName: e.target.value,
                          pricePerSquareMeter: proj ? proj.defaultPricePerM2 : formData.pricePerSquareMeter,
                          stage: proj?.stages?.[0] || formData.stage,
                          block: proj?.blocks?.[0] || formData.block,
                        });
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                    >
                      {projectList.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Etapa / Manzana
                    </label>
                    {(() => {
                      const curProj = projectList.find((p) => p.name === formData.projectName) || projectList[0];
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              list="quote-stages-list"
                              placeholder="Etapa 1"
                              value={formData.stage}
                              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-blue-600"
                            />
                            <datalist id="quote-stages-list">
                              {curProj?.stages?.map((s) => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <input
                              type="text"
                              list="quote-blocks-list"
                              placeholder="Manzana A"
                              value={formData.block}
                              onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-blue-600"
                            />
                            <datalist id="quote-blocks-list">
                              {curProj?.blocks?.map((b) => (
                                <option key={b} value={b} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lote / Unidad *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Lote 14"
                      value={formData.lotNumber}
                      onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Área Total (m²) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.totalArea}
                      onChange={(e) => setFormData({ ...formData, totalArea: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Valor por m² (COP) *
                    </label>
                    <input
                      type="number"
                      min="1000"
                      required
                      value={formData.pricePerSquareMeter}
                      onChange={(e) =>
                        setFormData({ ...formData, pricePerSquareMeter: Number(e.target.value) })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Valor Total Inmueble (Automático)
                    </label>
                    <div className="text-sm font-bold text-blue-950 bg-blue-50/70 border border-blue-200 rounded-lg px-3 py-2">
                      {formatCurrency(calcTotalPrice)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL CLIENTE (OPTANTE 1) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">2</span>
                  Datos del Cliente (Optante 1 / Titular Principal)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre Completo / Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tipo y Número de Identificación *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.clientDocType}
                        onChange={(e) => setFormData({ ...formData, clientDocType: e.target.value })}
                        className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-slate-900 w-24 shrink-0"
                      >
                        {DOC_TYPES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Número de Cédula/NIT"
                        value={formData.clientDocNumber}
                        onChange={(e) => setFormData({ ...formData, clientDocNumber: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 3124233810"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="cliente@ejemplo.com"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dirección de Residencia
                    </label>
                    <input
                      type="text"
                      placeholder="Calle o Carrera, Ciudad"
                      value={formData.clientAddress}
                      onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                {/* Switch Segundo Optante */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasSecondOptant}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hasSecondOptant: e.target.checked,
                          clientParticipation: e.target.checked ? 50 : 100,
                          secondOptantParticipation: e.target.checked ? 50 : 0,
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Incluir Segundo Optante / Co-propietario
                    </span>
                  </label>

                  {formData.hasSecondOptant && (
                    <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Nombre Segundo Optante *
                        </label>
                        <input
                          type="text"
                          required={formData.hasSecondOptant}
                          value={formData.secondOptantName || ""}
                          onChange={(e) => setFormData({ ...formData, secondOptantName: e.target.value })}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Cédula / Documento *
                        </label>
                        <input
                          type="text"
                          required={formData.hasSecondOptant}
                          value={formData.secondOptantDocNumber || ""}
                          onChange={(e) => setFormData({ ...formData, secondOptantDocNumber: e.target.value })}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Participación (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={formData.secondOptantParticipation || 50}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData({
                              ...formData,
                              secondOptantParticipation: val,
                              clientParticipation: Math.max(1, 100 - val),
                            });
                          }}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 3: PLAN FINANCIERO Y FORMA DE PAGO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">3</span>
                  Condiciones de Negocio y Plan de Pagos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Descuento */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={formData.hasDiscount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hasDiscount: e.target.checked,
                            discountAmount: e.target.checked ? formData.discountAmount || 5000000 : 0,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">Aplica Bono / Descuento</span>
                    </label>

                    {formData.hasDiscount && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="number"
                          placeholder="Monto Descuento"
                          value={formData.discountAmount}
                          onChange={(e) =>
                            setFormData({ ...formData, discountAmount: Number(e.target.value) })
                          }
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Motivo (ej. Bono Feria de Ventas)"
                          value={formData.discountDescription}
                          onChange={(e) =>
                            setFormData({ ...formData, discountDescription: e.target.value })
                          }
                          className="w-full text-[11px] bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    )}
                  </div>

                  {/* Separación */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Valor de Separación (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.reservationAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, reservationAmount: Number(e.target.value) })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-blue-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Pago para reserva efectiva del inmueble
                    </span>
                  </div>

                  {/* Cuotas y financiación */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Número de Cuotas Financiadas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={formData.installmentsCount}
                      onChange={(e) =>
                        setFormData({ ...formData, installmentsCount: Number(e.target.value) })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Financiación directa sin interés
                    </span>
                  </div>
                </div>

                {/* Resumen del cálculo en tiempo real */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Valor Final Lote</span>
                    <span className="font-bold text-slate-900">{formatCurrency(calcFinalPrice)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Cuota Inicial (10%)</span>
                    <span className="font-bold text-blue-900">{formatCurrency(calcInitialQuota)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Saldo a Financiar</span>
                    <span className="font-bold text-slate-900">{formatCurrency(calcBalance)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      {calcInstallments} Cuotas mensuales de
                    </span>
                    <span className="font-bold text-emerald-800">{formatCurrency(calcMonthlyQuota)}</span>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Observaciones Comerciales
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Condiciones pactadas con el cliente, notas de negociación, etc."
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {createSubmitting ? "Generando Cotización..." : "Emitir Cotización"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: VALIDACIÓN DE DATOS Y CONVERSIÓN A CONTRATO */}
      {/* ======================================================== */}
      {validatingQuote && validationData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del validador */}
            <div className="p-5 border-b border-emerald-100 bg-emerald-50/70 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Paso 2: Validación Jurídico-Comercial
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Validar Datos y Convertir {validatingQuote.consecutive} a Contrato de Separación
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Revise y complete los datos legales exigidos en los contratos oficiales de Monteazul para formalizar la separación.
                </p>
              </div>
              <button
                onClick={() => setValidatingQuote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulario de validación */}
            <form onSubmit={handleValidationSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {validationError}
                </div>
              )}

              {/* Checklist de requisitos PDF */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Checklist de Requisitos del Contrato Oficial
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Identificación y Estado Civil
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Cuenta Bancaria del Optante
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Porcentajes de Participación (100%)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Confirmación de Separación
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Cuentas del Proyecto
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Cláusulas y Hoja de Negocio
                  </div>
                </div>
              </div>

              {/* VALIDACIÓN OPTANTE 1 */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  1. Validación Legal del Optante 1 (Titular Principal)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={validationData.clientName}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientName: e.target.value })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Identificación / Cédula *
                    </label>
                    <input
                      type="text"
                      required
                      value={validationData.clientDocNumber}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientDocNumber: e.target.value })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Estado Civil * (Requerido en Contrato)
                    </label>
                    <select
                      value={validationData.clientCivilStatus}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientCivilStatus: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-emerald-600"
                    >
                      {CIVIL_STATUS_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ciudad y País de Residencia *
                    </label>
                    <input
                      type="text"
                      required
                      value={validationData.clientCity}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientCity: e.target.value })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dirección de Domicilio *
                    </label>
                    <input
                      type="text"
                      required
                      value={validationData.clientAddress}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientAddress: e.target.value })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cuenta Bancaria del Optante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Bancolombia Ahorros #1234..."
                      value={validationData.clientBank}
                      onChange={(e) =>
                        setValidationData({ ...validationData, clientBank: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Porcentaje de Participación (%) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={validationData.clientParticipation}
                      onChange={(e) =>
                        setValidationData({
                          ...validationData,
                          clientParticipation: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* VALIDACIÓN SEGUNDO OPTANTE SI APLICA */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validationData.hasSecondOptant}
                    onChange={(e) =>
                      setValidationData({
                        ...validationData,
                        hasSecondOptant: e.target.checked,
                        clientParticipation: e.target.checked ? 50 : 100,
                        secondOptantParticipation: e.target.checked ? 50 : 0,
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Suscripción Conjunta con Segundo Optante
                  </span>
                </label>

                {validationData.hasSecondOptant && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Nombre Segundo Optante *
                      </label>
                      <input
                        type="text"
                        required={validationData.hasSecondOptant}
                        value={validationData.secondOptantName || ""}
                        onChange={(e) =>
                          setValidationData({
                            ...validationData,
                            secondOptantName: e.target.value,
                          })
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Cédula / Identificación *
                      </label>
                      <input
                        type="text"
                        required={validationData.hasSecondOptant}
                        value={validationData.secondOptantDocNumber || ""}
                        onChange={(e) =>
                          setValidationData({
                            ...validationData,
                            secondOptantDocNumber: e.target.value,
                          })
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Estado Civil Segundo Optante *
                      </label>
                      <select
                        value={validationData.secondOptantCivilStatus || "Soltero(a)"}
                        onChange={(e) =>
                          setValidationData({
                            ...validationData,
                            secondOptantCivilStatus: e.target.value,
                          })
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      >
                        {CIVIL_STATUS_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Cuenta Bancaria Segundo Optante
                      </label>
                      <input
                        type="text"
                        placeholder="Banco y número..."
                        value={validationData.secondOptantBank || ""}
                        onChange={(e) =>
                          setValidationData({
                            ...validationData,
                            secondOptantBank: e.target.value,
                          })
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Participación (%) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={validationData.secondOptantParticipation || 50}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setValidationData({
                            ...validationData,
                            secondOptantParticipation: val,
                            clientParticipation: Math.max(1, 100 - val),
                          });
                        }}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: CONFIRMACIÓN DE SEPARACIÓN */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  2. Verificación de Separación y Datos Contractuales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Valor de Separación Confirmado (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={validationData.reservationAmount}
                      onChange={(e) =>
                        setValidationData({
                          ...validationData,
                          reservationAmount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Fecha de Pago de la Separación *
                    </label>
                    <input
                      type="date"
                      required
                      value={validationData.reservationDate}
                      onChange={(e) =>
                        setValidationData({
                          ...validationData,
                          reservationDate: e.target.value,
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cuotas Hoja de Negocio
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={validationData.installmentsCount}
                      onChange={(e) =>
                        setValidationData({
                          ...validationData,
                          installmentsCount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nota o Concepto de la Validación Comercial
                  </label>
                  <input
                    type="text"
                    value={validationData.validationNotes || ""}
                    onChange={(e) =>
                      setValidationData({
                        ...validationData,
                        validationNotes: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              {/* Botón de conversión oficial */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Al confirmar, se generará el <strong>Contrato de Separación oficial</strong> con consecutivo legal único.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setValidatingQuote(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={validationSubmitting}
                    className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {validationSubmitting
                      ? "Generando Contrato Oficial..."
                      : "Confirmar Validación y Generar Contrato"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
