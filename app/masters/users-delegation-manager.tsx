"use client";

import { useState, useTransition } from "react";
import {
  updateUserDelegation,
  createUser,
  toggleUserStatus,
} from "./actions";

export interface UserRoleItem {
  roleId: string;
  role: {
    id: string;
    name: string;
  };
}

export interface UserAreaItem {
  areaId: string;
  area: {
    id: string;
    name: string;
    code: string;
  };
}

export interface UserDelegationData {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date;
  roles: UserRoleItem[];
  areas: UserAreaItem[];
}

export interface SimpleRole {
  id: string;
  name: string;
  description: string | null;
}

export interface SimpleArea {
  id: string;
  name: string;
  code: string;
}

interface Props {
  users: UserDelegationData[];
  roles: SimpleRole[];
  areas: SimpleArea[];
  isGeneralAdmin: boolean;
}

export default function UsersDelegationManager({
  users,
  roles,
  areas,
  isGeneralAdmin,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isPending, startTransition] = useTransition();

  // Modal para editar delegación
  const [editModalUser, setEditModalUser] = useState<UserDelegationData | null>(
    null
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [userActive, setUserActive] = useState<boolean>(true);

  // Modal para crear usuario
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
  const [newAreaIds, setNewAreaIds] = useState<string[]>([]);

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    if (filterRole !== "all") {
      const hasRole = u.roles.some((r) => r.roleId === filterRole);
      if (!hasRole) return false;
    }

    if (filterArea !== "all") {
      const hasArea = u.areas.some((a) => a.areaId === filterArea);
      if (!hasArea) return false;
    }

    if (filterStatus !== "all") {
      const matchStatus = filterStatus === "active" ? u.active : !u.active;
      if (!matchStatus) return false;
    }

    return true;
  });

  const openEditModal = (user: UserDelegationData) => {
    setEditModalUser(user);
    setSelectedRoleIds(user.roles.map((r) => r.roleId));
    setSelectedAreaIds(user.areas.map((a) => a.areaId));
    setUserActive(user.active);
  };

  const handleSaveDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", editModalUser.id);
        fd.set("roleIds", JSON.stringify(selectedRoleIds));
        fd.set("areaIds", JSON.stringify(selectedAreaIds));
        fd.set("active", userActive ? "true" : "false");

        await updateUserDelegation(fd);
        setEditModalUser(null);
        alert(`Delegación de "${editModalUser.name}" actualizada con éxito.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar delegación.";
        alert(message);
      }
    });
  };

  const handleToggleStatus = (userId: string) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        await toggleUserStatus(fd);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cambiar estado.";
        alert(message);
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", newUserName.trim());
        fd.set("email", newUserEmail.trim());
        fd.set("password", newUserPassword);
        fd.set("roleIds", JSON.stringify(newRoleIds));
        fd.set("areaIds", JSON.stringify(newAreaIds));

        await createUser(fd);
        setCreateModalOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewRoleIds([]);
        setNewAreaIds([]);
        alert("Usuario registrado y configurado con éxito.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear usuario.";
        alert(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-blue-950">
              Asignación de Usuarios y Delegación de Actividades
            </h2>
            <p className="text-xs text-slate-600">
              De acuerdo con los puntos 8 y 21 del documento maestro: asigna roles corporativos y delega membresía a áreas operativas para atender o supervisar solicitudes.
            </p>
          </div>

          {isGeneralAdmin && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <span>+ Registrar Usuario</span>
            </button>
          )}
        </div>

        {/* Barra de Búsqueda y Filtros Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-blue-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Buscar usuario
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o correo..."
              className="w-full rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Filtrar por Rol
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Todos los roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Filtrar por Área Delegada
            </label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Estado de Cuenta
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-50/80 border-b border-blue-200 text-blue-950 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Roles Asignados</th>
                <th className="px-4 py-3">Áreas Operativas Delegadas</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron usuarios que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {u.email}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin rol asignado
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r.roleId}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-900 border border-blue-200"
                            >
                              {r.role.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.areas.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Acceso general (sin área operativa)
                          </span>
                        ) : (
                          u.areas.map((a) => (
                            <span
                              key={a.areaId}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {a.area.name} ({a.area.code})
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.active
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : "bg-red-100 text-red-900 border-red-300"
                        }`}
                      >
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isGeneralAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
                            >
                              Configurar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.id)}
                              disabled={isPending}
                              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors border ${
                                u.active
                                  ? "text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
                                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                              }`}
                              title={u.active ? "Suspender acceso" : "Reactivar acceso"}
                            >
                              {u.active ? "Desactivar" : "Activar"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-blue-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Mostrando <strong>{filteredUsers.length}</strong> de{" "}
            <strong>{users.length}</strong> usuarios registrados
          </span>
        </div>
      </div>

      {/* Modal: Editar Delegación y Roles */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-blue-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                Configuración de Delegación: {editModalUser.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {editModalUser.email}
              </p>
            </div>

            <form onSubmit={handleSaveDelegation} className="space-y-5">
              {/* Interruptor de Estado Activo */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <div>
                  <div className="text-xs font-bold text-blue-950">
                    Estado de la Cuenta
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Permite o bloquea el inicio de sesión del usuario en la plataforma.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userActive}
                    onChange={(e) => setUserActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
                </label>
              </div>

              {/* Roles Asignados */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  1. Roles Asignados (Permisos de Módulos)
                </label>
                <p className="text-[11px] text-slate-500">
                  Los roles determinan qué vistas y módulos puede consultar o administrar el usuario.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {roles.map((r) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-blue-50 border-blue-400 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedRoleIds((prev) =>
                              prev.includes(r.id)
                                ? prev.filter((id) => id !== r.id)
                                : [...prev, r.id]
                            );
                          }}
                          className="mt-0.5 rounded border-blue-300 text-blue-700 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          {r.description && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                              {r.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Áreas Operativas Delegadas */}
              <div className="space-y-2 pt-2 border-t border-blue-100">
                <label className="block text-xs font-bold text-slate-800">
                  2. Áreas Operativas Delegadas (Membresía de Trabajo)
                </label>
                <p className="text-[11px] text-slate-500">
                  Permite al usuario operar, atender, recibir asignaciones de tareas o dirigir solicitudes destinadas a estas áreas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {areas.map((a) => {
                    const isChecked = selectedAreaIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-400 shadow-xs text-emerald-950 font-bold"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedAreaIds((prev) =>
                              prev.includes(a.id)
                                ? prev.filter((id) => id !== a.id)
                                : [...prev, a.id]
                            );
                          }}
                          className="rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                        />
                        <span className="text-xs">
                          {a.name} ({a.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                >
                  {isPending ? "Guardando..." : "Guardar Delegación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Usuario */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-blue-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                Registrar Nuevo Usuario
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cree la cuenta del colaborador y asigne sus roles y áreas operativas iniciales.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Correo Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@monteazul.com"
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Selección de Roles */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Roles a Asignar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roles.map((r) => {
                    const isChecked = newRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                          isChecked
                            ? "bg-blue-50 border-blue-400 font-semibold text-blue-950"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setNewRoleIds((prev) =>
                              prev.includes(r.id)
                                ? prev.filter((id) => id !== r.id)
                                : [...prev, r.id]
                            );
                          }}
                          className="rounded border-blue-300 text-blue-700 focus:ring-blue-500"
                        />
                        <span>{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Selección de Áreas Delegadas */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Áreas Operativas Delegadas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {areas.map((a) => {
                    const isChecked = newAreaIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-400 font-semibold text-emerald-950"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setNewAreaIds((prev) =>
                              prev.includes(a.id)
                                ? prev.filter((id) => id !== a.id)
                                : [...prev, a.id]
                            );
                          }}
                          className="rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                        />
                        <span>{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                >
                  {isPending ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
