"use client";

import { useState, useTransition } from "react";
import {
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
} from "./actions";

export interface PermissionData {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  module: string | null;
}

export interface RoleData {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{
    permissionId: string;
    permission: PermissionData;
  }>;
  _count: {
    users: number;
  };
}

interface Props {
  roles: RoleData[];
  permissions: PermissionData[];
  isGeneralAdmin: boolean;
}

export default function RolesManager({
  roles,
  permissions,
  isGeneralAdmin,
}: Props) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id || ""
  );
  const [isPending, startTransition] = useTransition();

  // Modales de Rol
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  // Permisos seleccionados para el rol actual
  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>(
    activeRole?.permissions.map((p) => p.permissionId) || []
  );

  // Sincronizar permisos cuando cambia el rol seleccionado
  const handleSelectRole = (role: RoleData) => {
    setSelectedRoleId(role.id);
    setSelectedPermIds(role.permissions.map((p) => p.permissionId));
  };

  // Agrupar permisos por módulo
  const modulesMap = permissions.reduce<Record<string, PermissionData[]>>(
    (acc, perm) => {
      const mod = perm.module || "General";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {}
  );

  const handleTogglePermission = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleToggleModuleAll = (modulePerms: PermissionData[]) => {
    const modulePermIds = modulePerms.map((p) => p.id);
    const allChecked = modulePermIds.every((id) => selectedPermIds.includes(id));

    if (allChecked) {
      setSelectedPermIds((prev) => prev.filter((id) => !modulePermIds.includes(id)));
    } else {
      setSelectedPermIds((prev) => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleSavePermissions = () => {
    if (!activeRole) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("roleId", activeRole.id);
        fd.set("permissionIds", JSON.stringify(selectedPermIds));
        await updateRolePermissions(fd);
        alert(`Permisos para el rol "${activeRole.name}" guardados correctamente.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al guardar permisos.";
        alert(message);
      }
    });
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: RoleData) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", roleName.trim());
        if (roleDescription.trim()) fd.set("description", roleDescription.trim());

        if (editingRole) {
          fd.set("id", editingRole.id);
          await updateRole(fd);
        } else {
          await createRole(fd);
        }
        setRoleModalOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al guardar el rol.";
        alert(message);
      }
    });
  };

  const handleDeleteRole = (role: RoleData) => {
    if (!confirm(`¿Confirma que desea eliminar el rol "${role.name}"?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", role.id);
        await deleteRole(fd);
        if (selectedRoleId === role.id && roles.length > 1) {
          const next = roles.find((r) => r.id !== role.id);
          if (next) handleSelectRole(next);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al eliminar el rol.";
        alert(message);
      }
    });
  };

  const isCoreRole = (name: string) =>
    ["Administrador General", "Director de Área", "Operador"].includes(name);

  return (
    <div className="space-y-6">
      {/* Barra de cabecera con botón de acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-blue-950">
            Matriz de Roles y Vistas Permitidas
          </h2>
          <p className="text-xs text-slate-600">
            Configura qué vistas, módulos corporativos y acciones operativas están habilitados para cada rol del sistema.
          </p>
        </div>
        {isGeneralAdmin && (
          <button
            type="button"
            onClick={openCreateRoleModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <span>+ Crear Nuevo Rol</span>
          </button>
        )}
      </div>

      {/* Grid de 2 columnas: Lista de Roles a la izquierda y Matriz de Permisos a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Roles (4 columnas en LG) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 px-1">
            Roles Registrados ({roles.length})
          </div>

          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = activeRole?.id === role.id;
              const permCount = role.permissions.length;

              return (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-400"
                      : "bg-white border-blue-200 hover:border-blue-300 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-950">
                          {role.name}
                        </span>
                        {isCoreRole(role.name) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                            Base
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {role.description || "Sin descripción establecida."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Usuarios:{" "}
                      <strong className="text-blue-950">
                        {role._count.users}
                      </strong>
                    </span>
                    <span>
                      Permisos:{" "}
                      <strong className="text-blue-950">{permCount}</strong>
                    </span>

                    {isGeneralAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditRoleModal(role);
                          }}
                          className="text-blue-700 hover:text-blue-900 font-semibold p-1 hover:bg-blue-100/50 rounded"
                          title="Editar rol"
                        >
                          Editar
                        </button>
                        {!isCoreRole(role.name) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }}
                            className="text-red-600 hover:text-red-800 font-semibold p-1 hover:bg-red-50 rounded"
                            title="Eliminar rol"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Matriz de Permisos para el Rol Seleccionado (8 columnas en LG) */}
        <div className="lg:col-span-8 space-y-4">
          {activeRole ? (
            <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
              {/* Encabezado del Rol Seleccionado */}
              <div className="bg-blue-50/70 p-4 sm:p-5 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Permisos asignados al rol:
                    </span>
                    <span className="text-base font-bold text-blue-950">
                      {activeRole.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeRole.description ||
                      "Personaliza el acceso a vistas y funciones para este perfil."}
                  </p>
                </div>

                {isGeneralAdmin && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSavePermissions}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                  >
                    {isPending ? "Guardando..." : "Guardar Permisos"}
                  </button>
                )}
              </div>

              {/* Lista de Permisos Agrupados por Módulo */}
              <div className="p-4 sm:p-6 space-y-6 divide-y divide-blue-100">
                {Object.entries(modulesMap).map(([moduleName, modulePerms], idx) => {
                  const moduleCheckedCount = modulePerms.filter((p) =>
                    selectedPermIds.includes(p.id)
                  ).length;
                  const allChecked = moduleCheckedCount === modulePerms.length;

                  return (
                    <div
                      key={moduleName}
                      className={idx === 0 ? "space-y-3" : "pt-5 space-y-3"}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                            📁 {moduleName}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            {moduleCheckedCount} / {modulePerms.length} activos
                          </span>
                        </div>

                        {isGeneralAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(modulePerms)}
                            className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold"
                          >
                            {allChecked ? "Desmarcar todos" : "Marcar todos"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {modulePerms.map((perm) => {
                          const isChecked = selectedPermIds.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                isChecked
                                  ? "bg-blue-50/50 border-blue-300 shadow-xs"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              } ${!isGeneralAdmin ? "cursor-default" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                disabled={!isGeneralAdmin || isPending}
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="mt-0.5 w-4 h-4 rounded border-blue-300 text-blue-700 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <div className="text-xs">
                                <div className="font-bold text-slate-900">
                                  {perm.name || perm.key}
                                </div>
                                {perm.description && (
                                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                    {perm.description}
                                  </p>
                                )}
                                <span className="inline-block mt-1 font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {perm.key}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pie de guardado inferior */}
              {isGeneralAdmin && (
                <div className="bg-slate-50 p-4 border-t border-blue-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    Total de permisos activos:{" "}
                    <strong className="text-blue-950">
                      {selectedPermIds.length}
                    </strong>{" "}
                    de {permissions.length}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSavePermissions}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    {isPending ? "Guardando..." : "Guardar Permisos del Rol"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-blue-300 rounded-xl bg-blue-50/40 text-xs text-slate-600">
              Seleccione o cree un rol para configurar sus permisos de vistas.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear / Editar Rol */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-blue-200 shadow-xl space-y-4">
            <div className="border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                {editingRole ? "Editar Rol" : "Crear Nuevo Rol"}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Defina la denominación y alcance del rol para asignar permisos de acceso.
              </p>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Ej: Auditor de Calidad, Coordinador Comercial..."
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Explique las funciones y responsabilidades asociadas a este rol..."
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                >
                  {isPending ? "Guardando..." : "Guardar Rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
