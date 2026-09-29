"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/number-to-words";
import { ContractItem } from "../contract-list-view";

interface Props {
  contract: ContractItem;
  projectLogoUrl?: string | null;
}

export default function ContractDocumentView({ contract, projectLogoUrl }: Props) {
  const formattedDate = new Date(contract.date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra de Acciones (Oculta al imprimir) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/commercial/contracts"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Volver a contratos"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{contract.contractNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {contract.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Generado a partir de la cotización {contract.quote.consecutive} · {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/commercial/quotes/${contract.quote.id}`}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver Cotización de Origen
          </Link>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Contrato Oficial (PDF)
          </button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL: CONTRATO DE SEPARACIÓN (Idéntico a los PDFs legales de Monteazul) */}
      <div className="bg-white p-8 md:p-14 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 space-y-6 text-slate-900 leading-relaxed text-xs">
        {/* Cabecera y Promotor con Logotipos Institucionales */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-3.5">
              {/* Logo Monteazul Corporativo */}
              <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shadow-2xs">
                <img
                  src="/logos/logo-monteazul.jpg"
                  alt="Monteazul Group"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900 uppercase">
                  C. PROMOTOR:
                </div>
                <p className="text-xs text-slate-700 mt-1 max-w-xl">
                  <strong>MONTEAZUL GROUP S.A.S</strong>, sociedad legalmente constituida bajo el <strong>NIT. 901.662.298-6</strong>, constituida bajo matrícula mercantil 352661 de la Cámara de Comercio de Ibagué y representada legalmente por el señor <strong>ANDRES FELIPE ALVAREZ GRANADOS</strong>, identificado con la cédula de ciudadanía No <strong>1.110.540.527</strong>, quien para los efectos del presente negocio jurídico se denominará el <strong>PROMOTOR</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Logo Oficial del Proyecto Inmobiliario */}
              {projectLogoUrl && (
                <div className="w-36 sm:w-44 h-20 sm:h-24 shrink-0 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shadow-2xs">
                  <img
                    src={projectLogoUrl}
                    alt={contract.projectName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Consecutivo Oficial</div>
                <div className="text-base font-black text-blue-900">{contract.contractNumber}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Fecha: {formattedDate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center py-2">
          <h1 className="text-lg font-black tracking-wider text-slate-950 uppercase">
            CONTRATO DE SEPARACIÓN
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Documento de reserva inmobiliaria vinculado a la propuesta {contract.quote.consecutive}
          </p>
        </div>

        {/* I. IDENTIFICACIÓN GENERAL */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
            I. IDENTIFICACIÓN GENERAL
          </h2>

          {/* A. DATOS GENERALES DEL(OS) INMUEBLE(S) */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase">
              A. DATOS GENERALES DEL(OS) INMUEBLE(S)
            </h3>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-center text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300">ETAPA</th>
                    <th className="p-2 border-r border-slate-300">MANZANA</th>
                    <th className="p-2 border-r border-slate-300">LOTE</th>
                    <th className="p-2">M²</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold text-slate-900">
                    <td className="p-2 border-r border-slate-200">{contract.stage}</td>
                    <td className="p-2 border-r border-slate-200">{contract.block}</td>
                    <td className="p-2 border-r border-slate-200">{contract.lotNumber}</td>
                    <td className="p-2">{contract.totalArea} m²</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* B. DATOS BÁSICOS DE EL(OS) OPTANTE(S) */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase">
              B. DATOS BÁSICOS DE EL(OS) OPTANTE(S):
            </h3>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                  <tr>
                    <th className="p-2 text-left border-r border-slate-300 w-1/3">CAMPO</th>
                    <th className="p-2 text-left border-r border-slate-300">OPTANTE 1 (TITULAR)</th>
                    {contract.hasOptant2 && <th className="p-2 text-left">OPTANTE 2</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Nombre:</td>
                    <td className="p-2 font-semibold uppercase border-r border-slate-200">{contract.optant1Name}</td>
                    {contract.hasOptant2 && <td className="p-2 font-semibold uppercase">{contract.optant2Name}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Identificación:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1Doc}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2Doc}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Participación:</td>
                    <td className="p-2 font-bold text-blue-900 border-r border-slate-200">{contract.optant1Participation}%</td>
                    {contract.hasOptant2 && <td className="p-2 font-bold text-blue-900">{contract.optant2Participation}%</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Dirección:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1Address}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2Address || "-"}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Ciudad/País de Residencia:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1City}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2City || "-"}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Teléfono:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1Phone}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2Phone || "-"}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Estado Civil:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1CivilStatus}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2CivilStatus || "-"}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Correo Electrónico:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1Email}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2Email || "-"}</td>}
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r border-slate-200">Cuenta Bancaria:</td>
                    <td className="p-2 border-r border-slate-200">{contract.optant1Bank}</td>
                    {contract.hasOptant2 && <td className="p-2">{contract.optant2Bank || "-"}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* II. CLÁUSULAS CONTRACTUALES */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
            II. CLÁUSULAS CONTRACTUALES
          </h2>

          {/* PRIMERO */}
          <div className="text-justify leading-relaxed">
            <p>
              <strong>PRIMERO. OBJETO:</strong> El PROMOTOR se compromete a reservar a favor del optante y este se obliga a pagar el precio aquí pactado, para mantener la reserva del inmueble identificado en la parte introductoria de este contrato del conjunto denominado <strong>"{contract.projectName}"</strong> localizado en <strong>{contract.projectLocation}</strong>.
            </p>
          </div>

          {/* SEGUNDO */}
          <div className="text-justify leading-relaxed space-y-2">
            <p>
              <strong>SEGUNDO. PRECIO y FORMA DE PAGO:</strong> El precio del inmueble es la suma de <strong>{contract.totalPriceWords} ({formatCurrency(contract.totalPrice)})</strong>, suma que EL(OS) OPTANTE(S) se obliga a pagar así:
            </p>
            <p className="pl-4">
              <strong>A) SEPARACIÓN:</strong> La suma dineraria que pagará por la separación del inmueble será de <strong>{contract.reservationAmountWords} ({formatCurrency(contract.reservationAmount)})</strong>, dinero que se paga al momento de la suscripción del presente instrumento a la fecha de <strong>{formattedDate}</strong>.
            </p>
            <p className="pl-4">
              <strong>B) BONO DE DESCUENTO:</strong> El inmueble cuenta con un bono de descuento {contract.totalPrice > 0 ? "aplicado sobre la cotización inicial" : "NO"}.
            </p>
            <p className="pl-4 text-slate-800">
              Las sumas anteriormente referidas se pagarán en efectivo en la dirección Cra 5ta Sur No. 83-40 Mall Comercial La Florida 3 local 8 de la ciudad de Ibagué – en Bogotá en el Edificio Business 93 (Cra. 15 #93a-84, Bogotá) Cuarto Piso Of 406 o mediante operación bancaria o transferencia a nombre del PROMOTOR exclusivamente en las siguientes cuentas autorizadas; no se aceptarán pagos realizados a otras cuentas: <strong>{contract.authorizedBankAccounts}</strong>. El valor de la cuota inicial es el valor del diez por ciento (10%) del valor total del precio de(os) bien(es) inmueble(s) separado(s).
            </p>
          </div>

          {/* TERCERO */}
          <div className="text-justify leading-relaxed">
            <p>
              <strong>TERCERO. SUSCRIPCIÓN DEL CONTRATO "HOJA DE NEGOCIO":</strong> EL(OS) OPTANTE (ES) se compromete a suscribir la HOJA DE NEGOCIO de bien inmueble, dentro de los diez días siguientes al pago de la totalidad de la cuota inicial o del término para el pago, siempre y cuando acredite con el respectivo comprobante, haber cumplido con el deber de pago.
            </p>
          </div>

          {/* CUARTO */}
          <div className="text-justify leading-relaxed">
            <p>
              <strong>CUARTO. SALDO DEL INMUEBLE:</strong> El saldo pendiente de pago es decir la suma de <strong>{contract.balanceAmountWords} ({formatCurrency(contract.balanceAmount)})</strong> será pagado en los términos de <strong>{contract.installmentsCount} cuotas</strong> y condiciones que se establezcan en la HOJA DE NEGOCIO de bien inmueble.
            </p>
          </div>

          {/* QUINTO */}
          <div className="text-justify leading-relaxed">
            <p>
              <strong>QUINTO. DESISTIMIENTO Y/O RETRACTO DEL(OS) OPTANTE(ES):</strong> EL(OS) OPTANTE(ES) queda(n) facultado(s) para que unilateralmente desista(n) y/o se retracte(n) del presente negocio jurídico, para lo cual debe(n) de manifestarlo expresamente al PROMOTOR mediante cualquier medio del cual se deje constancia su deseo de desistir y/o retractarse. Al hacer uso de la facultad de desistir y/o retractarse, EL(OS) OPTANTE(ES) pagará(n) a favor del PROMOTOR una suma de dinero equivalente al valor de la separación aquí pactado en el numeral A de la cláusula SEGUNDO. <strong>PARÁGRAFO 1:</strong> Este monto se descontará de los valores recibidos.
            </p>
          </div>
        </div>

        {/* SECCIÓN DE FIRMAS */}
        <div className="pt-10 border-t border-slate-300">
          <p className="text-[11px] text-slate-500 text-center mb-8">
            Para constancia de lo anterior, las partes suscriben el presente contrato en la fecha de expedición pactada.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Firma Promotor */}
            <div className="space-y-3">
              <div className="h-16 border-b-2 border-slate-800 flex items-end pb-1">
                <span className="text-xs font-semibold text-slate-400 italic">Firma y Sello Representante Legal</span>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">ANDRES FELIPE ALVAREZ GRANADOS</div>
                <div className="text-[11px] text-slate-600">C.C. 1.110.540.527</div>
                <div className="text-[11px] font-semibold text-blue-950 uppercase">MONTEAZUL GROUP S.A.S</div>
                <div className="text-[10px] text-slate-500">EL PROMOTOR</div>
              </div>
            </div>

            {/* Firma Optante 1 */}
            <div className="space-y-3">
              <div className="h-16 border-b-2 border-slate-800 flex items-end pb-1">
                <span className="text-xs font-semibold text-slate-400 italic">Firma del Optante Titular</span>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">{contract.optant1Name}</div>
                <div className="text-[11px] text-slate-600">Identificación: {contract.optant1Doc}</div>
                <div className="text-[10px] text-slate-500">OPTANTE 1 ({contract.optant1Participation}%)</div>
              </div>
            </div>

            {/* Firma Optante 2 si existe */}
            {contract.hasOptant2 && (
              <div className="space-y-3 md:col-start-2">
                <div className="h-16 border-b-2 border-slate-800 flex items-end pb-1">
                  <span className="text-xs font-semibold text-slate-400 italic">Firma del Segundo Optante</span>
                </div>
                <div>
                  <div className="font-bold text-slate-900 uppercase">{contract.optant2Name}</div>
                  <div className="text-[11px] text-slate-600">Identificación: {contract.optant2Doc}</div>
                  <div className="text-[10px] text-slate-500">OPTANTE 2 ({contract.optant2Participation}%)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie institucional */}
        <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-500 flex flex-col md:flex-row justify-between items-center gap-2">
          <div>
            Monteazul Group S.A.S · NIT: 901.662.298-6 · gerencia.comercial@monteazulgroup.com
          </div>
          <div>
            Sede Ibagué: Cra 5ta Sur No. 83-40 Mall La Florida · Bogotá: Edificio Business 93 Of 406
          </div>
        </div>
      </div>
    </div>
  );
}
