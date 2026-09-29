/**
 * Convierte un número numérico a su representación en letras en español
 * con la convención colombiana de contratos: "... PESOS M/CTE"
 */

const UNIDADES = [
  "",
  "UN",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
];

const DECENAS = [
  "",
  "DIEZ",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function convertirGrupo(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";

  let out = "";
  const c = Math.floor(n / 100);
  const r = n % 100;

  if (c > 0) {
    out += CENTENAS[c] + " ";
  }

  if (r <= 20) {
    out += UNIDADES[r];
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    if (d === 2 && u > 0) {
      out += "VEINTI" + UNIDADES[u];
    } else {
      out += DECENAS[d];
      if (u > 0) {
        out += " Y " + UNIDADES[u];
      }
    }
  }

  return out.trim();
}

export function numberToWordsPesos(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "CERO PESOS M/CTE";
  if (rounded === 1) return "UN PESO M/CTE";

  let resto = Math.abs(rounded);
  let partes: string[] = [];

  // Miles de millones
  const milesDeMillones = Math.floor(resto / 1_000_000_000);
  resto %= 1_000_000_000;
  if (milesDeMillones > 0) {
    if (milesDeMillones === 1) {
      partes.push("MIL MILLONES");
    } else {
      partes.push(convertirGrupo(milesDeMillones) + " MIL MILLONES");
    }
  }

  // Millones
  const millones = Math.floor(resto / 1_000_000);
  resto %= 1_000_000;
  if (millones > 0) {
    if (millones === 1) {
      partes.push("UN MILLÓN");
    } else {
      partes.push(convertirGrupo(millones) + " MILLONES");
    }
  }

  // Miles
  const miles = Math.floor(resto / 1_000);
  resto %= 1_000;
  if (miles > 0) {
    if (miles === 1) {
      partes.push("MIL");
    } else {
      partes.push(convertirGrupo(miles) + " MIL");
    }
  }

  // Cientos y unidades
  if (resto > 0) {
    partes.push(convertirGrupo(resto));
  }

  const textoFinal = partes.join(" ").replace(/\s+/g, " ").trim();
  return `${textoFinal} PESOS M/CTE`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
