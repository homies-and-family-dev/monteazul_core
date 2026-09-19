"use client";

import React, { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  createMasterValue,
  updateMasterValue,
  toggleMasterValueStatus,
  deleteMasterValue,
} from "./actions";

export interface MasterTypeData {
  id: string;
  key: string;
  name: string;
}

export interface MasterValueData {
  id: string;
  masterTypeId: string;
  areaId: string | null;
  value: string;
  active: boolean;
  area: {
    id: string;
    name: string;
    code: string;
  } | null;
  masterType: {
    id: string;
    key: string;
    name: string;
  };
}

export interface AreaData {
  id: string;
  name: string;
  code: string;
}

interface Props {
  masterTypes: MasterTypeData[];
  masterValues: MasterValueData[];
  areas: AreaData[];
  isGeneralAdmin: boolean;
  isAreaDirector: boolean;
  userAreaIds: string[];
  initialType?: string;
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function MastersManager({
  masterTypes,
  masterValues,
  areas,
  isGeneralAdmin,
  userAreaIds,
  initialType = "all",
}: Props) {
  const searchParams = useSearchParams();
  const currentTypeParam = searchParams.get("type") || initialType || "all";

  // Identificar el catálogo activo a partir del parámetro de URL (submenú del panel de navegación)
  const activeCatalogObj = masterTypes.find(
    (t) => t.key === currentTypeParam || t.id === currentTypeParam
  );
  const selectedCatalogId = activeCatalogObj ? activeCatalogObj.id : "all";

  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingValue, setEditingValue] = useState<MasterValueData | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state para crear valor
  const [newCatalogId, setNewCatalogId] = useState<string>(
    activeCatalogObj ? activeCatalogObj.id : (masterTypes[0]?.id ?? "")
  );
  const [newScopeAreaId, setNewScopeAreaId] = useState<string>(
    isGeneralAdmin ? "corporate" : (userAreaIds[0] ?? "")
  );
  const [newValueText, setNewValueText] = useState("");

  // Filtrado de valores maestros según el catálogo seleccionado en el panel de navegación
  const filteredValues = masterValues.filter((item) => {
    if (selectedCatalogId !== "all" && item.masterTypeId !== selectedCatalogId) return false;
    if (selectedScope === "corporate" && item.areaId !== null) return false;
    if (selectedScope !== "all" && selectedScope !== "corporate" && item.areaId !== selectedScope) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchVal = item.value.toLowerCase().includes(q);
      const matchCat = item.masterType.name.toLowerCase().includes(q);
      const matchArea = (item.area?.name ?? "corporativo").toLowerCase().includes(q);
      if (!matchVal && !matchCat && !matchArea) return false;
    }
    return true;
  });

  const activeValuesCount = filteredValues.filter((v) => v.active).length;
  const inactiveValuesCount = filteredValues.filter((v) => !v.active).length;

  const canManageItem = (item: MasterValueData) => {
    if (isGeneralAdmin) return true;
    if (!item.areaId) return false;
    return userAreaIds.includes(item.areaId);
  };

  const handleCreateValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catalogTarget = activeCatalogObj ? activeCatalogObj.id : newCatalogId;
    if (!catalogTarget || !newValueText.trim()) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("masterTypeId", catalogTarget);
        fd.set("areaId", newScopeAreaId);
        fd.set("value", newValueText.trim());
        await createMasterValue(fd);
        setNewValueText("");
        setShowCreateModal(false);
        setMessage({ type: "success", text: "Valor maestro registrado exitosamente." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al registrar el valor maestro.";
        setMessage({ type: "error", text: msg });
      }
    });
  };

  const handleUpdateValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingValue || !editingValue.value.trim()) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", editingValue.id);
        fd.set("value", editingValue.value.trim());
        await updateMasterValue(fd);
        setEditingValue(null);
        setMessage({ type: "success", text: "Valor maestro actualizado exitosamente." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar el valor.";
        setMessage({ type: "error", text: msg });
      }
    });
  };

  const handleToggleStatus = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        await toggleMasterValueStatus(fd);
        setMessage({
          type: "success",
          text: `Valor maestro ${currentActive ? "desactivado" : "activado"} correctamente.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cambiar el estado.";
        setMessage({ type: "error", text: msg });
      }
    });
  };

  const handleDelete = (id: string, valName: string) => {
    if (
      !confirm(
        `¿Confirma que desea eliminar el valor "${valName}"? Si ya fue usado en solicitudes históricas, el sistema rechazará la eliminación física para proteger la trazabilidad.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        await deleteMasterValue(fd);
        setMessage({ type: "success", text: `Valor "${valName}" eliminado exitosamente.` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el valor.";
        setMessage({ type: "error", text: msg });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de retroalimentación de operaciones */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          <span className="font-medium">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="font-bold text-xs px-2 py-0.5 rounded hover:bg-black/5 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas del Catálogo Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs text-slate-600 block font-medium">Catálogo Activo</span>
          <span className="text-lg font-bold text-blue-950 mt-1 block truncate">
            {activeCatalogObj ? activeCatalogObj.name : "Todos los Catálogos"}
          </span>
          <span className="text-[11px] font-mono text-slate-500 block truncate">
            {activeCatalogObj ? `Clave: ${activeCatalogObj.key}` : `${masterTypes.length} catálogos en el sistema`}
          </span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs text-slate-600 block font-medium">Valores Registrados</span>
          <span className="text-xl font-bold text-blue-950 mt-1 block">{filteredValues.length}</span>
          <span className="text-[11px] text-slate-500">
            {activeCatalogObj ? "Opciones configuradas para este catálogo" : "Total en todos los catálogos"}
          </span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs text-slate-600 block font-medium">Valores Activos</span>
          <span className="text-xl font-bold text-emerald-800 mt-1 block">{activeValuesCount}</span>
          <span className="text-[11px] text-slate-500">Disponibles en formularios</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs text-slate-600 block font-medium">Valores Inactivos</span>
          <span className="text-xl font-bold text-slate-700 mt-1 block">{inactiveValuesCount}</span>
          <span className="text-[11px] text-slate-500">Preservados para trazabilidad</span>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL A LO ANCHO DE LA PANTALLA */}
      <div className="space-y-4">
        {/* Cabecera del catálogo seleccionado con acción rápida de agregar valor */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-blue-950">
                {activeCatalogObj ? activeCatalogObj.name : "Todos los Catálogos del Sistema"}
              </h2>
              {activeCatalogObj && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-semibold">
                  {activeCatalogObj.key}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {activeCatalogObj
                ? `Gestione las opciones vigentes del catálogo "${activeCatalogObj.name}". Cada catálogo obedece a un proceso del sistema definido en el Core Corporativo.`
                : "Visualización integral de todos los catálogos maestros. Seleccione un submenú específico en el panel lateral de navegación para gestionar sus valores."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeCatalogObj) {
                setNewCatalogId(activeCatalogObj.id);
              }
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <IconPlus className="w-4 h-4" />
            <span>
              {activeCatalogObj ? `Agregar Valor a ${activeCatalogObj.name}` : "Agregar Valor Maestro"}
            </span>
          </button>
        </div>

        {/* Barra de Filtros (Ámbito y Búsqueda por texto) */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Filtrar por Ámbito / Área
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">-- Todos los ámbitos --</option>
                <option value="corporate">Ámbito Corporativo (Transversal)</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    Área: {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Búsqueda por texto
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por texto de valor..."
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Valores Maestros */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-blue-50/40 border-b border-blue-200 flex justify-between items-center text-xs">
            <span className="font-bold text-blue-950">
              Valores Registrados ({filteredValues.length})
            </span>
            <span className="text-slate-500 text-[11px]">
              {activeCatalogObj ? `Catálogo: ${activeCatalogObj.name}` : "Todos los catálogos"}
            </span>
          </div>

          {filteredValues.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No se encontraron valores maestros para los criterios seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Valor Maestro</th>
                    {selectedCatalogId === "all" && (
                      <th className="py-3 px-4 font-semibold">Catálogo</th>
                    )}
                    <th className="py-3 px-4 font-semibold">Ámbito / Área</th>
                    <th className="py-3 px-4 font-semibold text-center">Estado</th>
                    <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredValues.map((item) => {
                    const canManage = canManageItem(item);

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-blue-950">
                          {item.value}
                        </td>

                        {selectedCatalogId === "all" && (
                          <td className="py-3 px-4">
                            <span className="text-xs text-slate-700 font-medium">
                              {item.masterType.name}
                            </span>
                          </td>
                        )}

                        <td className="py-3 px-4">
                          {item.area ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              Área: {item.area.name} ({item.area.code})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              Corporativo Transversal
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.active
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-200 text-slate-700 border border-slate-300"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {canManage ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingValue(item)}
                                disabled={isPending}
                                className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-medium shadow-2xs transition-colors"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item.id, item.active)}
                                disabled={isPending}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium border shadow-2xs transition-colors ${
                                  item.active
                                    ? "bg-white border-amber-300 text-amber-800 hover:bg-amber-50"
                                    : "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                                }`}
                              >
                                {item.active ? "Desactivar" : "Activar"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.value)}
                                disabled={isPending}
                                className="px-2.5 py-1 rounded bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-medium shadow-2xs transition-colors"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Solo lectura
                            </span>
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
      </div>

      {/* MODAL PARA AGREGAR NUEVO VALOR MAESTRO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-sm font-bold text-blue-950">
                Nuevo Valor Maestro
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateValueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catálogo de Destino *
                </label>
                {activeCatalogObj ? (
                  <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 font-bold text-blue-950 flex items-center justify-between">
                    <span>{activeCatalogObj.name}</span>
                    <span className="text-[10px] font-mono text-blue-800">
                      {activeCatalogObj.key}
                    </span>
                  </div>
                ) : (
                  <select
                    value={newCatalogId}
                    onChange={(e) => setNewCatalogId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {masterTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.key})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ámbito de Aplicación *
                </label>
                <select
                  value={newScopeAreaId}
                  onChange={(e) => setNewScopeAreaId(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {isGeneralAdmin && (
                    <option value="corporate">Ámbito Corporativo (Transversal)</option>
                  )}
                  {areas
                    .filter((a) => isGeneralAdmin || userAreaIds.includes(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        Área: {a.name} ({a.code})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Determina si el valor estará disponible para toda la empresa o sólo para el área seleccionada.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre o Texto del Valor *
                </label>
                <input
                  type="text"
                  value={newValueText}
                  onChange={(e) => setNewValueText(e.target.value)}
                  placeholder="Ej: Solicitud de Campaña, Urgente, etc."
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {isPending ? "Guardando..." : "Guardar Valor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR VALOR MAESTRO */}
      {editingValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-sm font-bold text-blue-950">
                Editar Valor Maestro
              </h3>
              <button
                type="button"
                onClick={() => setEditingValue(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateValueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catálogo
                </label>
                <input
                  type="text"
                  value={editingValue.masterType.name}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Texto del Valor *
                </label>
                <input
                  type="text"
                  value={editingValue.value}
                  onChange={(e) =>
                    setEditingValue({ ...editingValue, value: e.target.value })
                  }
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingValue(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {isPending ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
