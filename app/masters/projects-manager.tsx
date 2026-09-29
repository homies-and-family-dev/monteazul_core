"use client";

import React, { useState, useTransition } from "react";
import {
  createCommercialProject,
  updateCommercialProject,
  toggleCommercialProjectActive,
  deleteCommercialProject,
} from "./actions";

export interface CommercialProjectData {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  location: string;
  cityDepartment: string;
  authorizedBankAccounts: string;
  defaultPricePerM2: number;
  stages: string[];
  blocks: string[];
  description: string | null;
  logoUrl: string | null;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Props {
  projects: CommercialProjectData[];
  canManage: boolean;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function ProjectsManager({ projects, canManage }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<CommercialProjectData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para vistas previas de logos
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editRemoveLogo, setEditRemoveLogo] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "ACTIVE" && !p.active) return false;
    if (statusFilter === "INACTIVE" && p.active) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.legalName.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term) ||
      p.cityDepartment.toLowerCase().includes(term) ||
      p.authorizedBankAccounts.toLowerCase().includes(term) ||
      p.stages.some((s) => s.toLowerCase().includes(term)) ||
      p.blocks.some((b) => b.toLowerCase().includes(term))
    );
  });

  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.active).length;
  const inactiveCount = totalCount - activeCount;

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createCommercialProject(formData);
        setMessage({ type: "success", text: "¡Proyecto inmobiliario creado con éxito!" });
        setShowCreateModal(false);
        setCreateLogoPreview(null);
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al crear el proyecto.",
        });
      }
    });
  };

  const openEditModal = (project: CommercialProjectData) => {
    setEditingProject(project);
    setEditLogoPreview(project.logoUrl);
    setEditRemoveLogo(false);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCommercialProject(formData);
        setMessage({ type: "success", text: "¡Proyecto actualizado correctamente!" });
        setEditingProject(null);
        setEditLogoPreview(null);
        setEditRemoveLogo(false);
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al actualizar el proyecto.",
        });
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await toggleCommercialProjectActive(id);
        setMessage({
          type: "success",
          text: `Proyecto ${currentActive ? "desactivado" : "activado"} con éxito.`,
        });
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al cambiar estado del proyecto.",
        });
      }
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await deleteCommercialProject(id);
        setMessage({
          type: "success",
          text: result.message,
        });
        setDeletingId(null);
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al procesar la eliminación del proyecto.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Mensajes */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="font-bold underline ml-4 hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Proyectos de Interés
          </span>
          <p className="text-2xl font-bold text-blue-950 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Registrados en Monteazul</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Proyectos Activos (En Oferta)
          </span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{activeCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-0.5 block">
            Disponibles en cotizaciones y agendamiento
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Proyectos Inactivos (Históricos)
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{inactiveCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Ocultos en formularios comerciales nuevos
          </span>
        </div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Búsqueda y Pestañas de Estado */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por proyecto, ubicación, banco, etapas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-blue-600"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Activos ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactivos ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Botón de Creación */}
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto Inmobiliario
          </button>
        )}
      </div>

      {/* Lista de Proyectos */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-blue-200 p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">No se encontraron proyectos inmobiliarios</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm
              ? "Pruebe con otros términos de búsqueda."
              : "Haga clic en 'Nuevo Proyecto Inmobiliario' para registrar el primero."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                project.active
                  ? "border-blue-200 hover:border-blue-400 hover:shadow-md"
                  : "border-slate-200 bg-slate-50/50 opacity-80"
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Cabecera de la tarjeta con Logo */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {project.logoUrl ? (
                      <div className="w-14 h-14 rounded-xl border border-blue-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={project.logoUrl}
                          alt={project.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center shrink-0 text-slate-400">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[9px] font-semibold mt-0.5 text-slate-400">Sin Logo</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-blue-950">{project.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            project.active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          {project.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                        {project.legalName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Precio Base / m²
                    </span>
                    <span className="text-sm font-black text-blue-900">
                      {formatCurrency(project.defaultPricePerM2)}
                    </span>
                  </div>
                </div>

                {/* Ubicación y Ciudad */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-slate-800">{project.cityDepartment}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{project.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200/60">
                    <svg
                      className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Cuentas Bancarias Autorizadas:
                      </span>
                      <p className="text-[11px] font-mono text-slate-700">{project.authorizedBankAccounts}</p>
                    </div>
                  </div>
                </div>

                {/* Etapas y Manzanas */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Etapas Disponibles ({project.stages.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.stages.map((stage, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md"
                        >
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Manzanas Disponibles ({project.blocks.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.blocks.map((block, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"
                        >
                          {block}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {project.description && (
                  <p className="text-[11px] text-slate-600 italic bg-amber-50/40 p-2 rounded-lg border border-amber-200/60">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Pie de tarjeta con acciones */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Slug: {project.slug}
                </span>

                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(project.id, project.active)}
                      disabled={isPending}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all border ${
                        project.active
                          ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      {project.active ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      onClick={() => openEditModal(project)}
                      className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-md font-semibold transition-all"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => setDeletingId(project.id)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded-md transition-all font-semibold"
                      title="Eliminar o deshabilitar proyecto"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CREACIÓN */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-blue-950">Nuevo Proyecto Inmobiliario</h3>
                <p className="text-xs text-slate-500">
                  Agregue un proyecto de interés para que esté disponible en cotizaciones, contratos y agendamiento.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Comercial *
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="Ej. Club Náutico Monteazul"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Denominación Legal (Contratos)
                  </label>
                  <input
                    name="legalName"
                    placeholder="Ej. CLUB NÁUTICO MONTEAZUL (opcional, en mayúsculas)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Municipio y Departamento *
                  </label>
                  <input
                    name="cityDepartment"
                    required
                    placeholder="Ej. Vereda Tomogó, Prado, Tolima"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Precio Base por m² (COP) *
                  </label>
                  <input
                    name="defaultPricePerM2"
                    type="number"
                    min="1000"
                    defaultValue="150000"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ubicación Legal / Dirección Minuta *
                </label>
                <input
                  name="location"
                  required
                  placeholder="Ej. vereda TOMOGÓ zona del municipio de PRADO – TOLIMA"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cuentas Bancarias Autorizadas (Para Contrato de Separación) *
                </label>
                <textarea
                  name="authorizedBankAccounts"
                  required
                  rows={2}
                  placeholder="Ej. BANCOLOMBIA Cta. Ahorros #71800003828 (CONVENIO 14269), BANCOLOMBIA Cta. Corriente #71800003923"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Etapas Disponibles (Separadas por coma)
                  </label>
                  <input
                    name="stages"
                    placeholder="Etapa 1, Etapa 2, Etapa Náutica"
                    defaultValue="Etapa 1, Etapa 2"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Se desplegarán en el formulario de cotizaciones.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Manzanas Disponibles (Separadas por coma)
                  </label>
                  <input
                    name="blocks"
                    placeholder="Manzana A, Manzana B, Manzana C"
                    defaultValue="Manzana A, Manzana B, Manzana C"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Permite seleccionar o digitar en cotizaciones.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción o Notas del Proyecto (Opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Características especiales del proyecto, amenidades o tipología de lotes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              {/* Carga de Logo del Proyecto */}
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80 space-y-2">
                <label className="block font-bold text-blue-950 text-xs">
                  Logo del Proyecto (Impreso en Contratos y Cotizaciones)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {createLogoPreview ? (
                    <div className="relative w-16 h-16 rounded-xl border-2 border-blue-400 bg-white p-1 shrink-0 overflow-hidden shadow-xs">
                      <img src={createLogoPreview} alt="Preview Logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCreateLogoPreview(null)}
                        className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-bl-lg px-1.5 py-0.5 text-[9px] font-bold"
                        title="Quitar imagen"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 bg-white flex flex-col items-center justify-center shrink-0 text-blue-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[8px] font-bold mt-0.5">Subir Logo</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      name="logoFile"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCreateLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Formatos: PNG, JPG, WebP o SVG. Se imprimirá en el encabezado oficial de las cotizaciones y contratos de separación.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar Proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-blue-950">Editar Proyecto: {editingProject.name}</h3>
                <p className="text-xs text-slate-500">
                  Modifique las características, precios y parámetros del proyecto inmobiliario.
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <input type="hidden" name="id" value={editingProject.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Comercial *
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={editingProject.name}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Denominación Legal (Contratos)
                  </label>
                  <input
                    name="legalName"
                    defaultValue={editingProject.legalName}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Municipio y Departamento *
                  </label>
                  <input
                    name="cityDepartment"
                    required
                    defaultValue={editingProject.cityDepartment}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Precio Base por m² (COP) *
                  </label>
                  <input
                    name="defaultPricePerM2"
                    type="number"
                    min="1000"
                    defaultValue={editingProject.defaultPricePerM2}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ubicación Legal / Dirección Minuta *
                </label>
                <input
                  name="location"
                  required
                  defaultValue={editingProject.location}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cuentas Bancarias Autorizadas (Para Contrato de Separación) *
                </label>
                <textarea
                  name="authorizedBankAccounts"
                  required
                  rows={2}
                  defaultValue={editingProject.authorizedBankAccounts}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Etapas Disponibles (Separadas por coma)
                  </label>
                  <input
                    name="stages"
                    defaultValue={editingProject.stages.join(", ")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Manzanas Disponibles (Separadas por coma)
                  </label>
                  <input
                    name="blocks"
                    defaultValue={editingProject.blocks.join(", ")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción o Notas del Proyecto
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProject.description || ""}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-blue-600"
                />
              </div>

              {/* Carga de Logo del Proyecto en Edición */}
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80 space-y-2">
                <label className="block font-bold text-blue-950 text-xs">
                  Logo del Proyecto (Impreso en Contratos y Cotizaciones)
                </label>
                <input type="hidden" name="removeLogo" value={editRemoveLogo ? "true" : "false"} />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {!editRemoveLogo && editLogoPreview ? (
                    <div className="relative w-16 h-16 rounded-xl border-2 border-blue-400 bg-white p-1 shrink-0 overflow-hidden shadow-xs">
                      <img src={editLogoPreview} alt="Logo actual" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setEditRemoveLogo(true)}
                        className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-bl-lg px-1.5 py-0.5 text-[9px] font-bold"
                        title="Quitar logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 bg-white flex flex-col items-center justify-center shrink-0 text-blue-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[8px] font-bold mt-0.5">{editRemoveLogo ? "Sin Logo" : "Subir Logo"}</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      name="logoFile"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditLogoPreview(URL.createObjectURL(file));
                          setEditRemoveLogo(false);
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[10px] text-slate-500">
                        Seleccione un archivo nuevo para reemplazar o actualizar el logo.
                      </p>
                      {!editRemoveLogo && editLogoPreview && (
                        <button
                          type="button"
                          onClick={() => setEditRemoveLogo(true)}
                          className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          Eliminar Logo
                        </button>
                      )}
                      {editRemoveLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditRemoveLogo(false);
                            setEditLogoPreview(editingProject.logoUrl);
                          }}
                          className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          Restaurar Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Actualizar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">¿Eliminar proyecto inmobiliario?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Si este proyecto ya cuenta con cotizaciones, contratos o visitas agendadas, el sistema lo marcará como <strong>Inactivo</strong> para preservar la trazabilidad e historial jurídico de los clientes. Si no tiene vínculos, será removido permanentemente.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                disabled={isPending}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
