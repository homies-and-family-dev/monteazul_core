export interface CommercialProjectInfo {
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
  description?: string | null;
  logoUrl?: string | null;
  active?: boolean;
}

export const MONTEAZUL_PROMOTER = {
  name: "MONTEAZUL GROUP S.A.S",
  nit: "901.662.298-6",
  mercantileRegistration: "352661 de la Cámara de Comercio de Ibagué",
  legalRepresentative: "ANDRES FELIPE ALVAREZ GRANADOS",
  legalRepresentativeDoc: "1.110.540.527",
  ibagueAddress: "Cra 5ta Sur No. 83-40 Mall Comercial La Florida 3 local 8, Ibagué",
  bogotaAddress: "Edificio Business 93 (Cra. 15 #93a-84) Cuarto Piso Of 406, Bogotá",
  commercialEmail: "gerencia.comercial@monteazulgroup.com",
  portfolioEmail: "cartera@monteazulgroup.com",
  phone: "+573124233810",
  mainBankDeposit: "BANCOLOMBIA Cta. Corriente #07900008250 a nombre del PROMOTOR",
};

export const COMMERCIAL_PROJECTS: CommercialProjectInfo[] = [
  {
    id: "altos-las-victorias",
    slug: "altos-las-victorias",
    name: "Altos Las Victorias",
    legalName: "ALTOS LAS VICTORIAS",
    location: "predio La Trinitaria Km 4 Vía Prado Purificación (Tolima)",
    cityDepartment: "Prado / Purificación, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 150000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C", "Manzana D"],
    active: true,
  },
  {
    id: "club-nautico",
    slug: "club-nautico",
    name: "Club Náutico Monteazul",
    legalName: "CLUB NÁUTICO MONTEAZUL",
    location: "vereda TOMOGÓ zona del municipio de PRADO – TOLIMA",
    cityDepartment: "Vereda Tomogó, Prado, Tolima",
    authorizedBankAccounts:
      "BANCOLOMBIA Cta. Ahorros #71800003828 (CONVENIO 14269), BANCOLOMBIA Cta. Corriente #71800003923 o DAVIVIENDA Cta. Cte. #108969957571",
    defaultPricePerM2: 250000,
    stages: ["Etapa 1", "Etapa 2", "Etapa Náutica"],
    blocks: ["Manzana A", "Manzana B", "Manzana C", "Manzana D", "Manzana E"],
    active: true,
  },
  {
    id: "entre-montanas",
    slug: "entre-montanas",
    name: "Entre Montañas",
    legalName: "ENTRE MONTAÑAS",
    location: "sector rural del municipio de PRADO – TOLIMA",
    cityDepartment: "Prado, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 120000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C"],
    active: true,
  },
  {
    id: "golf-club",
    slug: "golf-club",
    name: "Golf Club Monteazul",
    legalName: "MONTEAZUL GOLF CLUB",
    location: "zona campestre del municipio de PRADO – TOLIMA",
    cityDepartment: "Prado, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 200000,
    stages: ["Etapa 1", "Etapa 2", "Etapa 3"],
    blocks: ["Manzana A", "Manzana B", "Manzana C", "Manzana D"],
    active: true,
  },
  {
    id: "llanos-las-victorias",
    slug: "llanos-las-victorias",
    name: "Llanos Las Victorias",
    legalName: "LLANOS LAS VICTORIAS",
    location: "predio La Trinitaria Km 4 Vía Prado Purificación (Tolima)",
    cityDepartment: "Prado / Purificación, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 140000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C"],
    active: true,
  },
  {
    id: "monteverde-del-restrepo",
    slug: "monteverde-del-restrepo",
    name: "Monteverde del Restrepo",
    legalName: "MONTEVERDE DEL RESTREPO",
    location: "sector campestre del municipio de RESTREPO – META",
    cityDepartment: "Restrepo, Meta",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 180000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C", "Manzana D"],
    active: true,
  },
  {
    id: "quintas-las-victorias",
    slug: "quintas-las-victorias",
    name: "Quintas Las Victorias",
    legalName: "QUINTAS LAS VICTORIAS",
    location: "predio La Trinitaria Km 4 Vía Prado Purificación (Tolima)",
    cityDepartment: "Prado / Purificación, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 160000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C"],
    active: true,
  },
  {
    id: "reservas-de-prado",
    slug: "reservas-de-prado",
    name: "Reservas de Prado",
    legalName: "RESERVAS DE PRADO",
    location: "zona turística y embalse del municipio de PRADO – TOLIMA",
    cityDepartment: "Prado, Tolima",
    authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
    defaultPricePerM2: 175000,
    stages: ["Etapa 1", "Etapa 2"],
    blocks: ["Manzana A", "Manzana B", "Manzana C"],
    active: true,
  },
];

export function getProjectByName(name: string): CommercialProjectInfo {
  const match = COMMERCIAL_PROJECTS.find(
    (p) =>
      p.name.toLowerCase() === name.toLowerCase() ||
      p.legalName.toLowerCase() === name.toLowerCase() ||
      p.id.toLowerCase() === name.toLowerCase().replace(/\s+/g, "-")
  );

  return (
    match || {
      id: "general",
      slug: "general",
      name: name || "Proyecto Monteazul",
      legalName: name ? name.toUpperCase() : "PROYECTO MONTEAZUL",
      location: "Tolima, Colombia",
      cityDepartment: "Tolima, Colombia",
      authorizedBankAccounts: "BANCOLOMBIA Cta. Corriente #71800004641",
      defaultPricePerM2: 150000,
      stages: ["Etapa 1"],
      blocks: ["Manzana A"],
      active: true,
    }
  );
}
