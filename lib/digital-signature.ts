import crypto from "crypto";

export interface SignatureMetadata {
  loanId: string;
  folio: string;
  documentType: "F-MKT-01" | "F-MKT-02";
  userId: string;
  userName: string;
  userEmail: string;
  roleOrArea: string;
  timestamp: Date;
  itemsCount: number;
}

/**
 * Genera un hash criptográfico SHA-256 inmutable para certificar
 * la integridad de un acta digital bajo la política institucional de cero papel.
 */
export function generateSignatureHash(meta: SignatureMetadata): string {
  const payload = [
    meta.documentType,
    meta.folio,
    meta.loanId,
    meta.userId,
    meta.userEmail,
    meta.timestamp.toISOString(),
    `items:${meta.itemsCount}`,
    "MONTEAZUL_CORE_ZERO_PAPER_V1",
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Formatea el identificador de verificación pública para pie de página de actas.
 */
export function formatVerificationCode(hash: string): string {
  const clean = hash.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `SEC-${clean.substring(0, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}`;
}

export interface CertificateSummary {
  verificationCode: string;
  hashPreview: string;
  fullHash: string;
  isSigned: boolean;
  legalNotice: string;
}

export function getCertificateSummary(hash?: string | null): CertificateSummary {
  if (!hash) {
    return {
      verificationCode: "PENDIENTE",
      hashPreview: "No firmado aún",
      fullHash: "",
      isSigned: false,
      legalNotice: "Documento pendiente de certificación digital.",
    };
  }

  return {
    verificationCode: formatVerificationCode(hash),
    hashPreview: `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`,
    fullHash: hash,
    isSigned: true,
    legalNotice:
      "Documento firmado electrónicamente con valor probatorio pleno. Certificado por Monteazul Core bajo directriz institucional de Cero Papel.",
  };
}

