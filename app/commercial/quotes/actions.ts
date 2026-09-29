"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MONTEAZUL_PROMOTER } from "@/lib/commercial-projects";
import { getCommercialProjectByName } from "@/lib/commercial-projects-server";
import { numberToWordsPesos } from "@/lib/number-to-words";
import { findOrCreateCommercialClient } from "@/lib/commercial-clients";

export interface QuoteFormData {
  projectName: string;
  stage?: string;
  block?: string;
  lotNumber: string;
  totalArea: number;
  pricePerSquareMeter: number;

  clientName: string;
  clientDocType: string;
  clientDocNumber: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity?: string;
  clientCivilStatus?: string;
  clientBank?: string;
  clientParticipation?: number;

  hasSecondOptant?: boolean;
  secondOptantName?: string;
  secondOptantDocType?: string;
  secondOptantDocNumber?: string;
  secondOptantPhone?: string;
  secondOptantEmail?: string;
  secondOptantAddress?: string;
  secondOptantCity?: string;
  secondOptantCivilStatus?: string;
  secondOptantBank?: string;
  secondOptantParticipation?: number;

  hasDiscount?: boolean;
  discountAmount?: number;
  discountDescription?: string;
  reservationAmount?: number;
  reservationDate?: string;
  initialQuotaPercent?: number;
  installmentsCount?: number;
  observations?: string;
  advisorId?: string;
  bookingId?: string;
}

export async function createCommercialQuote(data: QuoteFormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado. Inicie sesión." };
  }

  try {
    const totalArea = Math.max(0, Number(data.totalArea) || 0);
    const pricePerM2 = Math.max(0, Number(data.pricePerSquareMeter) || 0);
    const totalPrice = Math.round(totalArea * pricePerM2);

    const hasDiscount = Boolean(data.hasDiscount);
    const discountAmount = hasDiscount ? Math.max(0, Number(data.discountAmount) || 0) : 0;
    const finalPrice = Math.max(0, totalPrice - discountAmount);

    const reservationAmount = Math.max(0, Number(data.reservationAmount) || 0);
    const initialQuotaPercent = Number(data.initialQuotaPercent) || 10;
    const initialQuotaAmount = Math.round(finalPrice * (initialQuotaPercent / 100));

    const financedBalance = Math.max(0, finalPrice - reservationAmount);
    const installmentsCount = Math.max(1, Number(data.installmentsCount) || 12);
    const installmentAmount = Math.round(financedBalance / installmentsCount);

    const year = new Date().getFullYear();
    const countThisYear = await prisma.commercialQuote.count();
    const consecutive = `COT-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

    // Vincular o crear cliente en el directorio unificado comercial
    const unifiedClient = await findOrCreateCommercialClient({
      name: data.clientName,
      docType: data.clientDocType,
      docNumber: data.clientDocNumber,
      phone: data.clientPhone,
      email: data.clientEmail,
      address: data.clientAddress,
      city: data.clientCity,
      civilStatus: data.clientCivilStatus,
      bank: data.clientBank,
      advisorId: data.advisorId || session.user.id,
      createdById: session.user.id,
    });

    const quote = await prisma.commercialQuote.create({
      data: {
        consecutive,
        status: "EMITIDA",
        date: new Date(),
        validityDays: 3,

        projectName: data.projectName,
        stage: data.stage || "Etapa 1",
        block: data.block || "Manzana A",
        lotNumber: data.lotNumber,
        totalArea,
        pricePerSquareMeter: pricePerM2,
        totalPrice,

        clientName: data.clientName.trim(),
        clientDocType: data.clientDocType || "CC",
        clientDocNumber: data.clientDocNumber.trim(),
        clientPhone: data.clientPhone.trim(),
        clientEmail: data.clientEmail.trim(),
        clientAddress: data.clientAddress.trim(),
        clientCity: data.clientCity?.trim() || "Colombia",
        clientCivilStatus: data.clientCivilStatus?.trim() || null,
        clientBank: data.clientBank?.trim() || null,
        clientParticipation: Number(data.clientParticipation) || 100,

        hasSecondOptant: Boolean(data.hasSecondOptant),
        secondOptantName: data.secondOptantName?.trim() || null,
        secondOptantDocType: data.secondOptantDocType || "CC",
        secondOptantDocNumber: data.secondOptantDocNumber?.trim() || null,
        secondOptantPhone: data.secondOptantPhone?.trim() || null,
        secondOptantEmail: data.secondOptantEmail?.trim() || null,
        secondOptantAddress: data.secondOptantAddress?.trim() || null,
        secondOptantCity: data.secondOptantCity?.trim() || null,
        secondOptantCivilStatus: data.secondOptantCivilStatus?.trim() || null,
        secondOptantBank: data.secondOptantBank?.trim() || null,
        secondOptantParticipation: data.hasSecondOptant
          ? Number(data.secondOptantParticipation) || 0
          : null,

        hasDiscount,
        discountAmount,
        discountDescription: data.discountDescription?.trim() || null,
        finalPrice,
        reservationAmount,
        reservationDate: data.reservationDate ? new Date(data.reservationDate) : new Date(),
        initialQuotaPercent,
        initialQuotaAmount,
        financedBalance,
        installmentsCount,
        installmentAmount,
        observations: data.observations?.trim() || null,

        clientId: unifiedClient.id,
        bookingId: data.bookingId || null,
        advisorId: data.advisorId || session.user.id,
        createdById: session.user.id,
      },
    });

    if (data.bookingId) {
      // Confirmar agendamiento como REALIZADA y registrar trazabilidad de feedback
      await prisma.commercialBooking.update({
        where: { id: data.bookingId },
        data: {
          status: "REALIZADA",
          feedbackNotes: `Cotización ${consecutive} generada tras la visita a terreno.`,
        },
      });
      revalidatePath("/commercial/schedule");
    }

    revalidatePath("/commercial/quotes");
    revalidatePath("/commercial/clients");
    revalidatePath("/commercial");
    return { success: true, quoteId: quote.id, consecutive: quote.consecutive };
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return { success: false, error: error.message || "Error al crear la cotización." };
  }
}

export interface ValidationAndContractPayload {
  // Optante 1
  clientName: string;
  clientDocType: string;
  clientDocNumber: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientCivilStatus: string;
  clientBank: string;
  clientParticipation: number;

  // Optante 2
  hasSecondOptant: boolean;
  secondOptantName?: string;
  secondOptantDocType?: string;
  secondOptantDocNumber?: string;
  secondOptantPhone?: string;
  secondOptantEmail?: string;
  secondOptantAddress?: string;
  secondOptantCity?: string;
  secondOptantCivilStatus?: string;
  secondOptantBank?: string;
  secondOptantParticipation?: number;

  // Inmueble y condiciones
  stage: string;
  block: string;
  lotNumber: string;
  totalArea: number;
  pricePerSquareMeter: number;
  reservationAmount: number;
  reservationDate: string;
  installmentsCount: number;
  validationNotes?: string;
}

export async function validateAndConvertToContract(
  quoteId: string,
  payload: ValidationAndContractPayload
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado. Inicie sesión." };
  }

  try {
    const existingQuote = await prisma.commercialQuote.findUnique({
      where: { id: quoteId },
      include: { contract: true },
    });

    if (!existingQuote) {
      return { success: false, error: "La cotización especificada no existe." };
    }

    if (existingQuote.contract) {
      return {
        success: false,
        error: "Esta cotización ya tiene un contrato de separación generado.",
        contractId: existingQuote.contract.id,
      };
    }

    // Validar participaciones
    if (payload.hasSecondOptant) {
      const part1 = Number(payload.clientParticipation) || 0;
      const part2 = Number(payload.secondOptantParticipation) || 0;
      if (part1 + part2 !== 100) {
        return {
          success: false,
          error: `La suma de porcentajes de participación debe ser exactamente 100% (actual: ${part1}% + ${part2}% = ${
            part1 + part2
          }%).`,
        };
      }
    }

    // Cálculos monetarios
    const totalArea = Number(payload.totalArea) || existingQuote.totalArea;
    const pricePerM2 = Number(payload.pricePerSquareMeter) || existingQuote.pricePerSquareMeter;
    const totalPrice = Math.round(totalArea * pricePerM2);
    const finalPrice = Math.max(0, totalPrice - existingQuote.discountAmount);
    const reservationAmount = Number(payload.reservationAmount) || existingQuote.reservationAmount;
    const balanceAmount = Math.max(0, finalPrice - reservationAmount);
    const installmentsCount = Number(payload.installmentsCount) || existingQuote.installmentsCount;

    // Obtener información jurídica del proyecto
    const projectInfo = await getCommercialProjectByName(existingQuote.projectName);

    // Palabras en letras
    const totalPriceWords = numberToWordsPesos(finalPrice);
    const reservationAmountWords = numberToWordsPesos(reservationAmount);
    const balanceAmountWords = numberToWordsPesos(balanceAmount);

    const year = new Date().getFullYear();
    const contractCount = await prisma.commercialContract.count();
    const contractNumber = `CS-${year}-${String(contractCount + 1).padStart(4, "0")}`;

    // Actualizar datos validados en el directorio unificado de clientes
    const verifiedClient = await findOrCreateCommercialClient({
      name: payload.clientName,
      docType: payload.clientDocType,
      docNumber: payload.clientDocNumber,
      phone: payload.clientPhone,
      email: payload.clientEmail,
      address: payload.clientAddress,
      city: payload.clientCity,
      civilStatus: payload.clientCivilStatus,
      bank: payload.clientBank,
      advisorId: session.user.id,
    });

    // Actualizar cotización a estado CONTRATADA con datos validados
    await prisma.commercialQuote.update({
      where: { id: quoteId },
      data: {
        status: "CONTRATADA",
        clientId: verifiedClient.id,
        dataValidated: true,
        validatedAt: new Date(),
        validatedById: session.user.id,
        validationNotes: payload.validationNotes?.trim() || "Datos y pago de separación validados satisfactoriamente.",

        clientName: payload.clientName.trim(),
        clientDocType: payload.clientDocType,
        clientDocNumber: payload.clientDocNumber.trim(),
        clientPhone: payload.clientPhone.trim(),
        clientEmail: payload.clientEmail.trim(),
        clientAddress: payload.clientAddress.trim(),
        clientCity: payload.clientCity.trim(),
        clientCivilStatus: payload.clientCivilStatus.trim(),
        clientBank: payload.clientBank.trim(),
        clientParticipation: Number(payload.clientParticipation) || 100,

        hasSecondOptant: Boolean(payload.hasSecondOptant),
        secondOptantName: payload.secondOptantName?.trim() || null,
        secondOptantDocType: payload.secondOptantDocType || "CC",
        secondOptantDocNumber: payload.secondOptantDocNumber?.trim() || null,
        secondOptantPhone: payload.secondOptantPhone?.trim() || null,
        secondOptantEmail: payload.secondOptantEmail?.trim() || null,
        secondOptantAddress: payload.secondOptantAddress?.trim() || null,
        secondOptantCity: payload.secondOptantCity?.trim() || null,
        secondOptantCivilStatus: payload.secondOptantCivilStatus?.trim() || null,
        secondOptantBank: payload.secondOptantBank?.trim() || null,
        secondOptantParticipation: payload.hasSecondOptant
          ? Number(payload.secondOptantParticipation) || 0
          : null,

        stage: payload.stage,
        block: payload.block,
        lotNumber: payload.lotNumber,
        totalArea,
        pricePerSquareMeter: pricePerM2,
        totalPrice,
        finalPrice,
        reservationAmount,
        reservationDate: payload.reservationDate ? new Date(payload.reservationDate) : new Date(),
        financedBalance: balanceAmount,
        installmentsCount,
        installmentAmount: Math.round(balanceAmount / installmentsCount),
      },
    });

    // Crear el Contrato de Separación oficial
    const contract = await prisma.commercialContract.create({
      data: {
        contractNumber,
        quoteId,
        date: new Date(),
        status: "VIGENTE",

        promoterName: MONTEAZUL_PROMOTER.name,
        promoterNit: MONTEAZUL_PROMOTER.nit,
        promoterRegistration: MONTEAZUL_PROMOTER.mercantileRegistration,
        promoterLegalRep: MONTEAZUL_PROMOTER.legalRepresentative,
        promoterRepDoc: MONTEAZUL_PROMOTER.legalRepresentativeDoc,
        promoterAddress: `${MONTEAZUL_PROMOTER.ibagueAddress} / ${MONTEAZUL_PROMOTER.bogotaAddress}`,
        promoterPhone: MONTEAZUL_PROMOTER.phone,
        promoterEmail: MONTEAZUL_PROMOTER.commercialEmail,

        projectName: projectInfo.legalName,
        projectLocation: projectInfo.location,
        stage: payload.stage || "Etapa 1",
        block: payload.block || "Manzana A",
        lotNumber: payload.lotNumber,
        totalArea,

        optant1Name: payload.clientName.trim(),
        optant1DocType: payload.clientDocType,
        optant1Doc: payload.clientDocNumber.trim(),
        optant1Participation: Number(payload.clientParticipation) || 100,
        optant1Address: payload.clientAddress.trim(),
        optant1City: payload.clientCity.trim(),
        optant1Phone: payload.clientPhone.trim(),
        optant1Email: payload.clientEmail.trim(),
        optant1CivilStatus: payload.clientCivilStatus.trim(),
        optant1Bank: payload.clientBank.trim(),

        hasOptant2: Boolean(payload.hasSecondOptant),
        optant2Name: payload.secondOptantName?.trim() || null,
        optant2DocType: payload.secondOptantDocType || "CC",
        optant2Doc: payload.secondOptantDocNumber?.trim() || null,
        optant2Participation: payload.hasSecondOptant
          ? Number(payload.secondOptantParticipation) || 0
          : null,
        optant2Address: payload.secondOptantAddress?.trim() || null,
        optant2City: payload.secondOptantCity?.trim() || null,
        optant2Phone: payload.secondOptantPhone?.trim() || null,
        optant2Email: payload.secondOptantEmail?.trim() || null,
        optant2CivilStatus: payload.secondOptantCivilStatus?.trim() || null,
        optant2Bank: payload.secondOptantBank?.trim() || null,

        totalPrice: finalPrice,
        totalPriceWords,
        reservationAmount,
        reservationAmountWords,
        reservationPaymentDate: payload.reservationDate
          ? new Date(payload.reservationDate)
          : new Date(),
        hasDiscount: existingQuote.hasDiscount,
        discountAmount: existingQuote.discountAmount,
        initialQuotaPercent: 10,
        initialQuotaAmount: Math.round(finalPrice * 0.1),
        balanceAmount,
        balanceAmountWords,
        installmentsCount,
        authorizedBankAccounts: projectInfo.authorizedBankAccounts,

        clientId: verifiedClient.id,
        createdById: session.user.id,
      },
    });

    revalidatePath("/commercial/quotes");
    revalidatePath(`/commercial/quotes/${quoteId}`);
    revalidatePath("/commercial/contracts");
    revalidatePath("/commercial/clients");
    revalidatePath(`/commercial/clients/${verifiedClient.id}`);
    revalidatePath("/commercial");

    return {
      success: true,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
    };
  } catch (error: any) {
    console.error("Error validating and creating contract:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la conversión a contrato.",
    };
  }
}

export async function updateContractStatus(
  contractId: string,
  status: "VIGENTE" | "FIRMADO" | "LEGALIZADO" | "DESISTIDO" | "ANULADO",
  notes?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado." };
  }

  try {
    const isSigned = status === "FIRMADO" || status === "LEGALIZADO";
    await prisma.commercialContract.update({
      where: { id: contractId },
      data: {
        status,
        notes: notes || undefined,
        isSigned,
        signedAt: isSigned ? new Date() : undefined,
      },
    });

    revalidatePath("/commercial/contracts");
    revalidatePath(`/commercial/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar contrato." };
  }
}

export async function deleteCommercialQuote(quoteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado." };
  }

  try {
    const quote = await prisma.commercialQuote.findUnique({
      where: { id: quoteId },
      include: { contract: true },
    });

    if (!quote) return { success: false, error: "No encontrado" };
    if (quote.contract) {
      return {
        success: false,
        error: "No se puede eliminar una cotización que ya cuenta con un contrato generado.",
      };
    }

    await prisma.commercialQuote.delete({
      where: { id: quoteId },
    });

    revalidatePath("/commercial/quotes");
    revalidatePath("/commercial");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar cotización." };
  }
}
