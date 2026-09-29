"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/number-to-words";
import { QuoteItem } from "../quote-list-view";

interface Props {
  quote: QuoteItem;
  projectLogoUrl?: string | null;
}

export default function QuoteDocumentView({ quote, projectLogoUrl }: Props) {
  const isContracted = quote.status === "CONTRATADA" && quote.contract;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra de Acciones (Oculta al Imprimir) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/commercial/quotes"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Volver a la lista"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{quote.consecutive}</span>
              {isContracted ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Convertida a Contrato ({quote.contract?.contractNumber})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Cotización Vigente
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Emitida el {new Date(quote.date).toLocaleDateString("es-CO")} · Validez de {quote.validityDays} días
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isContracted && (
            <Link
              href={`/commercial/contracts/${quote.contract?.id}`}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver Contrato Oficial
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL DE COTIZACIÓN (Formato idéntico a PDFs de Monteazul) */}
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 space-y-6">
        {/* Encabezado Institucional con Logotipos */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Logo Monteazul Corporativo */}
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shadow-2xs">
              <img
                src="/logos/logo-monteazul.jpg"
                alt="Monteazul Group"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-lg md:text-xl font-black tracking-widest text-slate-950 uppercase">
                MONTEAZUL GROUP S.A.S
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                Área Comercial · Cotización Informativa de Venta
              </div>
              <div className="text-[11px] text-slate-500">
                NIT: 901.662.298-6 · Matrícula 352661 C.C. Ibagué
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Logo Oficial del Proyecto de Interés */}
            {projectLogoUrl && (
              <div className="w-36 sm:w-44 h-20 sm:h-24 shrink-0 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shadow-2xs">
                <img
                  src={projectLogoUrl}
                  alt={quote.projectName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            <div className="text-right">
              <div className="text-sm font-bold text-blue-900 uppercase">
                {quote.consecutive}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                FECHA: <span className="font-semibold">{new Date(quote.date).toISOString().split("T")[0]}</span>
              </div>
              <div className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                Validez: {quote.validityDays} días
              </div>
            </div>
          </div>
        </div>

        {/* Datos Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6 text-xs text-slate-800 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">PROYECTO:</span>{" "}
            <span className="font-semibold text-blue-950 uppercase">{quote.projectName}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">CLIENTE:</span>{" "}
            <span className="font-semibold uppercase">{quote.clientName}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">TELÉFONO:</span>{" "}
            <span>{quote.clientPhone}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">NÚMERO IDENTIFICACIÓN:</span>{" "}
            <span className="font-semibold">{quote.clientDocType} {quote.clientDocNumber}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">EMAIL:</span>{" "}
            <span>{quote.clientEmail}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wide">DIRECCIÓN:</span>{" "}
            <span>{quote.clientAddress || "No registrada"}</span>
          </div>

          {quote.hasSecondOptant && (
            <div className="md:col-span-2 pt-2 border-t border-slate-200 text-blue-950">
              <span className="font-bold uppercase tracking-wide">CO-PROPIETARIO / SEGUNDO OPTANTE:</span>{" "}
              <span>{quote.secondOptantName} (Identificación: {quote.secondOptantDocType} {quote.secondOptantDocNumber})</span>
            </div>
          )}
        </div>

        {/* Tabla de Inmueble */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900 uppercase text-[11px]">
              <tr>
                <th className="p-3">Lote / Unidad</th>
                <th className="p-3 text-center">Etapa / Manzana</th>
                <th className="p-3 text-right">Área Total (m²)</th>
                <th className="p-3 text-right">Valor por m²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3 font-semibold text-slate-900">{quote.lotNumber}</td>
                <td className="p-3 text-center text-slate-600">
                  {quote.stage || "Etapa 1"} - {quote.block || "Manzana A"}
                </td>
                <td className="p-3 text-right font-medium">{quote.totalArea} m²</td>
                <td className="p-3 text-right font-medium">{formatCurrency(quote.pricePerSquareMeter)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Desglose de Valores y Financiación */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="font-bold text-slate-900 uppercase">VALOR DEL INMUEBLE</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(quote.totalPrice)}</span>
          </div>

          {quote.hasDiscount && (
            <div className="flex justify-between items-center py-1 border-b border-slate-200 text-emerald-800">
              <span>Bono de Descuento {quote.discountDescription ? `(${quote.discountDescription})` : ""}</span>
              <span className="font-bold">-{formatCurrency(quote.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="font-bold text-slate-900">Valor Final Lote</span>
            <span className="font-bold text-blue-950 text-base">{formatCurrency(quote.finalPrice)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span>Valor de Separación</span>
            <span className="font-semibold text-emerald-800">{formatCurrency(quote.reservationAmount)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span>Saldo Valor Lote a Financiar</span>
            <span className="font-semibold text-slate-800">{formatCurrency(quote.financedBalance)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span>Número de Cuotas</span>
            <span className="font-bold text-slate-900">{quote.installmentsCount}</span>
          </div>

          <div className="flex justify-between items-center py-1 pt-2">
            <span className="font-bold text-slate-900">Valor de la Cuota Mensual</span>
            <span className="font-bold text-blue-900 text-sm">{formatCurrency(quote.installmentAmount)}</span>
          </div>
        </div>

        {/* Observaciones */}
        {quote.observations && (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block mb-1">Observaciones:</span>
            <p className="text-slate-700 leading-relaxed">{quote.observations}</p>
          </div>
        )}

        {/* Notas Legales del PDF Oficial de Monteazul */}
        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1.5 leading-relaxed">
          <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">
            Notas Importantes y Condiciones Legales:
          </span>
          <p>
            • La presente cotización es informativa y tiene validez solo por tres días a partir de la fecha de expedición y/o disponibilidad del lote.
          </p>
          <p>
            • La separación se hace efectiva únicamente bajo las siguientes modalidades: en efectivo en sala de ventas, mediante consignación o transferencia bancaria a nombre del PROMOTOR en BANCOLOMBIA. Cta. Corriente #07900008250, y/o transferencia interbancaria internacional. Acompañada de LA FIRMA DEL CONTRATO DE SEPARACIÓN.
          </p>
          <p>
            • Gastos de escrituración establecidos por ley.
          </p>
          <p>
            • El plazo de financiación máximo es de acuerdo a número de cuotas establecidos en la presente cotización, sin interés financiado directamente con la constructora.
          </p>
          <p>
            • Una vez pagado el valor para separar el inmueble la presente cotización entra a ser parte del documento de contrato de separación.
          </p>
        </div>

        {/* Pie de página con asesor */}
        <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
          <div>
            Asesor Responsable: <span className="font-semibold text-slate-700">{quote.advisor?.name || "Asesor Comercial Monteazul"}</span>
          </div>
          <div>
            Monteazul Group S.A.S · Sistema Corporativo Monte Azul Suite
          </div>
        </div>
      </div>
    </div>
  );
}
