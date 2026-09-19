"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface UserPermissions {
  isGeneralAdmin: boolean;
  canAccessManagement: boolean;
  canAccessGoals?: boolean;
  canAccessStrategySection?: boolean;
  canAccessMasters: boolean;
  canAccessMarketing: boolean;
  canAccessMarketingCampaigns?: boolean;
  canAccessMarketingCalendar?: boolean;
  canAccessMarketingEquipment?: boolean;
}

export interface MasterTypeItem {
  id: string;
  key: string;
  name: string;
}

interface SidebarShellProps {
  user: UserProfile;
  roles: string[];
  areas: string[];
  permissions: UserPermissions;
  masterTypes?: MasterTypeItem[];
  children: React.ReactNode;
}

// Iconos SVG limpios y corporativos (Cero emojis)
function IconInbox({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4.5a2.5 2.5 0 01-2.5-2.5h-2a2.5 2.5 0 01-2.5 2.5H4" />
    </svg>
  );
}

function IconPlusCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconChartBar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconTarget({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMegaphone({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

function IconCalendar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconPackage({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconDatabase({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconLayoutGrid({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconMenu({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconX({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconSidebarCollapse({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18m7-12l-3 3 3 3" />
    </svg>
  );
}

function IconSidebarExpand({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18m3-6l3 3-3 3" />
    </svg>
  );
}

function IconLogOut({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function SidebarShell({
  user,
  roles,
  areas,
  permissions,
  masterTypes = [],
  children,
}: SidebarShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "catalogs";
  const currentMasterType = searchParams.get("type") || "all";

  // Estado del sidebar: colapsado (modo mini) o expandido
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Estado del drawer móvil
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Acordeón de Marketing: abierto por defecto si estamos en alguna ruta de marketing
  const isMarketingActive = pathname.startsWith("/marketing");
  const [marketingOpen, setMarketingOpen] = useState<boolean>(true);

  // Acordeón de Estrategia: abierto por defecto si estamos en management o goals
  const [managementOpen, setManagementOpen] = useState<boolean>(true);

  // Acordeón de Datos Maestros: abierto por defecto si estamos en masters
  const [mastersOpen, setMastersOpen] = useState<boolean>(true);

  // Sincronizar estado cuando cambia la ruta (patrón recomendado de React sin useEffect)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
    if (pathname.startsWith("/marketing")) {
      setMarketingOpen(true);
    }
    if (pathname.startsWith("/management") || pathname.startsWith("/goals")) {
      setManagementOpen(true);
    }
    if (pathname.startsWith("/masters")) {
      setMastersOpen(true);
    }
  }

  const primaryRole = roles[0] || "Usuario";
  const primaryArea = areas[0] || (permissions.isGeneralAdmin ? "Transversal" : "General");

  // Helper para verificar ruta activa
  const isRouteActive = (route: string, exact = false) => {
    if (exact) return pathname === route;
    if (route === "/requests") {
      return pathname === "/requests" || (pathname.startsWith("/requests/") && pathname !== "/requests/new");
    }
    return pathname.startsWith(route);
  };

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* OVERLAY PARA MÓVILES */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-2xs transition-opacity md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR NAVEGADOR DESPLEGABLE */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 flex flex-col border-r border-blue-200 bg-blue-50/70 transition-all duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-18" : "md:w-68 w-72"}`}
      >
        {/* CABECERA DEL SIDEBAR */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-blue-200 bg-white/90">
          <Link
            href="/requests"
            className={`flex items-center gap-3 overflow-hidden ${
              isCollapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              MA
            </div>
            {!isCollapsed && (
              <div className="leading-tight truncate">
                <span className="font-bold text-sm text-blue-950 block truncate">
                  Monte Azul Suite
                </span>
                <span className="text-[10px] text-blue-800 font-medium block truncate">
                  Core Corporativo
                </span>
              </div>
            )}
          </Link>

          {/* Botón cerrar en móvil */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-blue-950 hover:bg-blue-100 transition-colors"
            title="Cerrar menú"
          >
            <IconX className="w-5 h-5" />
          </button>

          {/* Botón colapsar/expandir en escritorio */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden md:flex p-1.5 rounded-lg text-blue-900 hover:text-blue-950 hover:bg-blue-100 transition-colors"
              title="Contraer barra lateral"
            >
              <IconSidebarCollapse className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* BOTÓN RE-EXPANDIR EN MODO COLAPSADO ESCRITORIO */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-blue-100 bg-blue-50/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-lg text-blue-800 hover:text-blue-950 hover:bg-blue-100 transition-colors"
              title="Expandir barra lateral"
            >
              <IconSidebarExpand className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TARJETA DE USUARIO RESUMIDA EN SIDEBAR */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mt-3 rounded-xl border border-blue-200/80 bg-white/95 shadow-2xs">
            <div className="text-xs font-bold text-blue-950 truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-slate-600 truncate mt-0.5">
              {user.email}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
                {primaryRole}
              </span>
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {primaryArea}
              </span>
            </div>
          </div>
        )}

        {/* LISTADO DE OPCIONES DEL MENÚ CON DESPLIEGUE POR ROL Y ÁREA */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* GRUPO 1: SOLICITUDES / CORE CORPORATIVO */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-900/80">
                Solicitudes
              </div>
            ) : (
              <div className="w-full h-px bg-blue-200 my-2" />
            )}

            <div className="space-y-1">
              <Link
                href="/requests"
                title={isCollapsed ? "Bandeja de Solicitudes" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isRouteActive("/requests")
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                <IconInbox className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Bandeja de Solicitudes</span>}
              </Link>

              <Link
                href="/requests/new"
                title={isCollapsed ? "Radicar Solicitud" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isRouteActive("/requests/new", true)
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                <IconPlusCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Radicar Solicitud</span>}
              </Link>
            </div>
          </div>

          {/* GRUPO 2: ESTRATEGIA Y GERENCIA (Directores y Gerencia) */}
          {(permissions.canAccessStrategySection ?? (permissions.canAccessManagement || (permissions.canAccessGoals ?? true))) && (
            <div>
              {!isCollapsed ? (
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/80">
                    Estrategia y Gerencia
                  </span>
                  <button
                    type="button"
                    onClick={() => setManagementOpen(!managementOpen)}
                    className="p-0.5 text-blue-800 hover:text-blue-950"
                    title={managementOpen ? "Colapsar sección" : "Desplegar sección"}
                  >
                    {managementOpen ? <IconChevronDown className="w-3.5 h-3.5" /> : <IconChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="w-full h-px bg-blue-200 my-2" />
              )}

              {(!isCollapsed ? managementOpen : true) && (
                <div className="space-y-1">
                  {permissions.canAccessManagement && (
                    <Link
                      href="/management"
                      title={isCollapsed ? "Módulo Gerencial y Reportes" : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isRouteActive("/management", true)
                          ? "bg-blue-700 text-white shadow-xs"
                          : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                    >
                      <IconChartBar className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">Módulo Gerencial</span>}
                    </Link>
                  )}

                  {(permissions.canAccessGoals ?? true) && (
                    <Link
                      href="/goals"
                      title={isCollapsed ? "Objetivos Gerenciales y de Área" : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isRouteActive("/goals", true)
                          ? "bg-blue-700 text-white shadow-xs"
                          : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                    >
                      <IconTarget className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">Objetivos de Área</span>}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GRUPO 3: ÁREAS FUNCIONALES */}
          {permissions.canAccessMarketing && (
            <div>
              {!isCollapsed ? (
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/80">
                    Áreas Funcionales
                  </span>
                </div>
              ) : (
                <div className="w-full h-px bg-blue-200 my-2" />
              )}

              {/* Acordeón del Área de Marketing */}
              <div className="space-y-1">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setMarketingOpen(!marketingOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-slate-800 hover:bg-blue-100/80 ${
                      isMarketingActive ? "bg-blue-100/90 text-blue-950 font-bold" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconMegaphone className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="truncate">Área de Marketing</span>
                    </div>
                    {marketingOpen ? (
                      <IconChevronDown className="w-3.5 h-3.5 text-blue-800" />
                    ) : (
                      <IconChevronRight className="w-3.5 h-3.5 text-blue-800" />
                    )}
                  </button>
                ) : (
                  <Link
                    href="/marketing"
                    title="Área de Marketing (Campañas)"
                    className={`flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all ${
                      isMarketingActive
                        ? "bg-blue-700 text-white shadow-xs"
                        : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                    }`}
                  >
                    <IconMegaphone className="w-4 h-4" />
                  </Link>
                )}

                {/* Submódulos de Marketing desplegables */}
                {(!isCollapsed ? marketingOpen : false) && (
                  <div className="pl-4 ml-2 border-l border-blue-200 space-y-1 pt-1">
                    {(permissions.canAccessMarketingCampaigns ?? true) && (
                      <Link
                        href="/marketing"
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          isRouteActive("/marketing", true)
                            ? "bg-blue-700 text-white font-bold shadow-xs"
                            : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                        }`}
                      >
                        <IconLayoutGrid className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Tablero y Campañas</span>
                      </Link>
                    )}

                    {(permissions.canAccessMarketingCalendar ?? true) && (
                      <Link
                        href="/marketing/calendar"
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          isRouteActive("/marketing/calendar", true)
                            ? "bg-blue-700 text-white font-bold shadow-xs"
                            : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                        }`}
                      >
                        <IconCalendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Calendario de Contenidos</span>
                      </Link>
                    )}

                    {(permissions.canAccessMarketingEquipment ?? true) && (
                      <Link
                        href="/marketing/equipment"
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          isRouteActive("/marketing/equipment", true)
                            ? "bg-blue-700 text-white font-bold shadow-xs"
                            : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                        }`}
                      >
                        <IconPackage className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Inventario y Préstamos</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GRUPO 4: CONFIGURACIÓN Y ADMINISTRACIÓN */}
          {permissions.canAccessMasters && (
            <div>
              {!isCollapsed ? (
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/80">
                    Configuración y Maestros
                  </span>
                </div>
              ) : (
                <div className="w-full h-px bg-blue-200 my-2" />
              )}

              <div className="space-y-1">
                {/* OPCIÓN 1: USUARIOS Y DELEGACIÓN (Exclusivo Administradores) */}
                {permissions.isGeneralAdmin && (
                  <Link
                    href="/masters?tab=users"
                    title={isCollapsed ? "Usuarios y Delegación de Actividades" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      pathname === "/masters" && currentTab === "users"
                        ? "bg-blue-700 text-white shadow-xs"
                        : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                    } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <IconUsers className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">Usuarios y Delegación</span>}
                  </Link>
                )}

                {/* OPCIÓN 2: ROLES Y VISTAS PERMITIDAS (Exclusivo Administradores) */}
                {permissions.isGeneralAdmin && (
                  <Link
                    href="/masters?tab=roles"
                    title={isCollapsed ? "Roles y Matriz de Permisos" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      pathname === "/masters" && currentTab === "roles"
                        ? "bg-blue-700 text-white shadow-xs"
                        : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                    } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <IconShield className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">Roles y Permisos</span>}
                  </Link>
                )}

                {/* OPCIÓN 3: CATÁLOGOS Y LISTAS MAESTRAS */}
                {!isCollapsed ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setMastersOpen(!mastersOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-slate-800 hover:bg-blue-100/80 ${
                        pathname === "/masters" && currentTab === "catalogs"
                          ? "bg-blue-100/90 text-blue-950 font-bold"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconDatabase className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="truncate">Catálogos y Listas</span>
                      </div>
                      {mastersOpen ? (
                        <IconChevronDown className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <IconChevronRight className="w-3.5 h-3.5 text-blue-800" />
                      )}
                    </button>

                    {mastersOpen && (
                      <div className="pl-4 ml-2 border-l border-blue-200 space-y-1 pt-1">
                        <Link
                          href="/masters?tab=catalogs"
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            pathname === "/masters" &&
                            currentTab === "catalogs" &&
                            currentMasterType === "all"
                              ? "bg-blue-700 text-white font-bold shadow-xs"
                              : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                          }`}
                        >
                          <IconLayoutGrid className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Todos los Catálogos</span>
                        </Link>

                        {masterTypes.map((mt) => {
                          const isSelected =
                            pathname === "/masters" &&
                            currentTab === "catalogs" &&
                            currentMasterType === mt.key;
                          return (
                            <Link
                              key={mt.id}
                              href={`/masters?tab=catalogs&type=${encodeURIComponent(mt.key)}`}
                              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                isSelected
                                  ? "bg-blue-700 text-white font-bold shadow-xs"
                                  : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isSelected ? "bg-white" : "bg-blue-600"
                                }`}
                              />
                              <span className="truncate">{mt.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/masters?tab=catalogs"
                    title="Catálogos y Datos Maestros"
                    className={`flex items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all ${
                      pathname === "/masters" && currentTab === "catalogs"
                        ? "bg-blue-700 text-white shadow-xs"
                        : "text-slate-700 hover:bg-blue-100/80 hover:text-blue-950"
                    }`}
                  >
                    <IconDatabase className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL SIDEBAR: BOTÓN CERRAR SESIÓN */}
        <div className="p-3 border-t border-blue-200 bg-white/90">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors border border-rose-200/60 ${
              isCollapsed ? "justify-center px-2" : ""
            }`}
          >
            <IconLogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* BOTÓN FLOTANTE PARA DISPOSITIVOS MÓVILES */}
      {!isMobileOpen && (
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-3 left-3 z-30 md:hidden p-2 rounded-lg bg-white/95 border border-blue-200 text-slate-700 hover:text-blue-950 hover:bg-blue-50 shadow-sm transition-colors"
          title="Abrir menú de navegación"
        >
          <IconMenu className="w-5 h-5" />
        </button>
      )}

      {/* ÁREA PRINCIPAL DERECHA: CONTENIDO EXCLUSIVO SIN BARRA SUPERIOR */}
      <main className="flex-1 min-w-0 bg-white">
        {children}
      </main>
    </div>
  );
}
