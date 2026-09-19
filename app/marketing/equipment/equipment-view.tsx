"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createEquipmentLoan,
  authorizeAndDeliverLoan,
  processLoanReturn,
} from "./actions";

export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  status: string;
  physicalCondition: string;
  location: string | null;
  accessories: string | null;
  photoUrl: string | null;
  notes: string | null;
}

export interface LoanItem {
  id: string;
  folio: string;
  purpose: string;
  startDate: Date | string;
  expectedReturnDate: Date | string;
  actualReturnDate: Date | string | null;
  status: string;
  borrowerId: string;
  borrower: { id: string; name: string; email: string };
  authorizedById: string | null;
  authorizedBy: { id: string; name: string } | null;
  taskId: string | null;
  task: { id: string; title: string } | null;
  requestId: string | null;
  request: { id: string; ticketNumber: string; title: string } | null;
  departureNotes: string | null;
  departurePhotoUrl: string | null;
  returnNotes: string | null;
  returnPhotoUrl: string | null;

  // Firmas Digitales
  departureDeliveredSignedAt?: Date | string | null;
  departureDeliveredSignedById?: string | null;
  departureDeliveredSignedBy?: { id: string; name: string; email: string } | null;
  departureReceivedSignedAt?: Date | string | null;
  departureReceivedSignedById?: string | null;
  departureReceivedSignedBy?: { id: string; name: string; email: string } | null;
  departureSignatureHash?: string | null;

  returnDeliveredSignedAt?: Date | string | null;
  returnDeliveredSignedById?: string | null;
  returnDeliveredSignedBy?: { id: string; name: string; email: string } | null;
  returnReceivedSignedAt?: Date | string | null;
  returnReceivedSignedById?: string | null;
  returnReceivedSignedBy?: { id: string; name: string; email: string } | null;
  returnSignatureHash?: string | null;

  items: Array<{
    id: string;
    equipmentId: string;
    conditionAtDeparture: string | null;
    conditionAtReturn: string | null;
    notes: string | null;
    equipment: EquipmentItem;
  }>;
}

interface Props {
  initialEquipment: EquipmentItem[];
  initialLoans: LoanItem[];
  marketingUsers: Array<{ id: string; name: string; email: string }>;
  coreRequests: Array<{ id: string; ticketNumber: string; title: string }>;
  canManage: boolean;
  currentUser: { id: string; name: string; email: string };
  currentUserId?: string;
}

const CATEGORIES = [
  "Cámaras",
  "Lentes / Óptica",
  "Iluminación",
  "Audio / Micrófonos",
  "Drones",
  "Estabilizadores / Trípodes",
  "Accesorios",
];

const PHYSICAL_CONDITIONS = ["Excelente", "Bueno", "Regular", "Con detalles"];

export default function EquipmentView({
  initialEquipment,
  initialLoans,
  marketingUsers,
  coreRequests,
  canManage,
  currentUser,
  currentUserId,
}: Props) {
  const activeUserId = currentUser?.id || currentUserId || "";
  const activeUserName = currentUser?.name || "Usuario en Sesión";
  const activeUserEmail = currentUser?.email || "";
  const [activeTab, setActiveTab] = useState<"inventory" | "activeLoans" | "history">("inventory");

  // Filtros de inventario
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modales
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [deliverModalLoan, setDeliverModalLoan] = useState<LoanItem | null>(null);
  const [returnModalLoan, setReturnModalLoan] = useState<LoanItem | null>(null);
  const [actaModalLoan, setActaModalLoan] = useState<{ loan: LoanItem; type: "F-MKT-01" | "F-MKT-02" } | null>(null);

  const [isPending, setIsPending] = useState(false);

  // Formulario Equipo
  const [eqCode, setEqCode] = useState("");
  const [eqName, setEqName] = useState("");
  const [eqCategory, setEqCategory] = useState("Cámaras");
  const [eqBrand, setEqBrand] = useState("Sony");
  const [eqModel, setEqModel] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [eqCondition, setEqCondition] = useState("Excelente");
  const [eqStatus, setEqStatus] = useState("Disponible");
  const [eqLocation, setEqLocation] = useState("");
  const [eqAccessories, setEqAccessories] = useState("");
  const [eqPhotoUrl, setEqPhotoUrl] = useState("");
  const [eqNotes, setEqNotes] = useState("");

  // Formulario Préstamo
  const [loanPurpose, setLoanPurpose] = useState("");
  const [loanBorrowerId, setLoanBorrowerId] = useState(marketingUsers[0]?.id || "");
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [loanStartTime, setLoanStartTime] = useState("08:30");
  const [loanExpectedReturnDate, setLoanExpectedReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [loanExpectedReturnTime, setLoanExpectedReturnTime] = useState("18:00");
  const [loanRequestId, setLoanRequestId] = useState("");
  const [loanSelectedEquipments, setLoanSelectedEquipments] = useState<string[]>([]);
  const [loanDepartureNotes, setLoanDepartureNotes] = useState("");
  const [loanDeparturePhotoUrl, setLoanDeparturePhotoUrl] = useState("");

  // Formulario Devolución
  const [returnHasIssues, setReturnHasIssues] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnPhotoUrl, setReturnPhotoUrl] = useState("");

  const openCreateEquipmentModal = () => {
    setEditingEquipment(null);
    setEqCode("");
    setEqName("");
    setEqCategory("Cámaras");
    setEqBrand("Sony");
    setEqModel("");
    setEqSerial("");
    setEqCondition("Excelente");
    setEqStatus("Disponible");
    setEqLocation("Armario Audiovisual Marketing");
    setEqAccessories("");
    setEqPhotoUrl("");
    setEqNotes("");
    setEquipmentModalOpen(true);
  };

  const openEditEquipmentModal = (eq: EquipmentItem) => {
    setEditingEquipment(eq);
    setEqCode(eq.code);
    setEqName(eq.name);
    setEqCategory(eq.category);
    setEqBrand(eq.brand);
    setEqModel(eq.model || "");
    setEqSerial(eq.serialNumber || "");
    setEqCondition(eq.physicalCondition);
    setEqStatus(eq.status);
    setEqLocation(eq.location || "");
    setEqAccessories(eq.accessories || "");
    setEqPhotoUrl(eq.photoUrl || "");
    setEqNotes(eq.notes || "");
    setEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim() || !eqBrand.trim()) {
      alert("Por favor ingrese el nombre y la marca del equipo.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    if (editingEquipment) fd.set("id", editingEquipment.id);
    if (eqCode) fd.set("code", eqCode);
    fd.set("name", eqName);
    fd.set("category", eqCategory);
    fd.set("brand", eqBrand);
    if (eqModel) fd.set("model", eqModel);
    if (eqSerial) fd.set("serialNumber", eqSerial);
    fd.set("physicalCondition", eqCondition);
    fd.set("status", eqStatus);
    if (eqLocation) fd.set("location", eqLocation);
    if (eqAccessories) fd.set("accessories", eqAccessories);
    if (eqPhotoUrl) fd.set("photoUrl", eqPhotoUrl);
    if (eqNotes) fd.set("notes", eqNotes);

    try {
      if (editingEquipment) {
        await updateEquipment(fd);
      } else {
        await createEquipment(fd);
      }
      setEquipmentModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el equipo.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este equipo del inventario?")) return;
    setIsPending(true);
    try {
      await deleteEquipment(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  const openLoanModal = () => {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    setLoanPurpose("");
    setLoanBorrowerId(activeUserId);
    setLoanStartDate(todayStr);
    setLoanStartTime(currentTimeStr);
    setLoanExpectedReturnDate(todayStr);
    setLoanExpectedReturnTime("18:00");
    setLoanRequestId("");
    setLoanSelectedEquipments([]);
    setLoanDepartureNotes("");
    setLoanDeparturePhotoUrl("");
    setLoanModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanPurpose.trim() || loanSelectedEquipments.length === 0) {
      alert("Ingrese el motivo del préstamo y seleccione al menos un equipo.");
      return;
    }

    const startDateTime = new Date(`${loanStartDate}T${loanStartTime}:00`);
    const expectedReturnDateTime = new Date(`${loanExpectedReturnDate}T${loanExpectedReturnTime}:00`);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (startDateTime < fiveMinutesAgo) {
      alert("Inconsistencia de fecha: La fecha y hora de entrega no puede ser anterior al momento actual.");
      return;
    }

    if (expectedReturnDateTime <= startDateTime) {
      alert("Inconsistencia de fecha: La fecha y hora proyectada de devolución debe ser posterior a la fecha y hora de entrega.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.set("purpose", loanPurpose);
    fd.set("borrowerId", activeUserId);
    fd.set("startDate", loanStartDate);
    fd.set("startTime", loanStartTime);
    fd.set("expectedReturnDate", loanExpectedReturnDate);
    fd.set("expectedReturnTime", loanExpectedReturnTime);
    if (loanRequestId) fd.set("requestId", loanRequestId);
    fd.set("equipmentIds", JSON.stringify(loanSelectedEquipments));
    if (loanDepartureNotes) fd.set("departureNotes", loanDepartureNotes);
    if (loanDeparturePhotoUrl) fd.set("departurePhotoUrl", loanDeparturePhotoUrl);

    try {
      await createEquipmentLoan(fd);
      setLoanModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear la solicitud de préstamo.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleAuthorizeDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalLoan) return;

    setIsPending(true);
    const fd = new FormData();
    fd.set("loanId", deliverModalLoan.id);
    if (loanDepartureNotes) fd.set("departureNotes", loanDepartureNotes);
    if (loanDeparturePhotoUrl) fd.set("departurePhotoUrl", loanDeparturePhotoUrl);

    try {
      await authorizeAndDeliverLoan(fd);
      setDeliverModalLoan(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al entregar los equipos.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalLoan) return;

    setIsPending(true);
    const fd = new FormData();
    fd.set("loanId", returnModalLoan.id);
    fd.set("hasIssues", returnHasIssues ? "true" : "false");
    if (returnNotes) fd.set("returnNotes", returnNotes);
    if (returnPhotoUrl) fd.set("returnPhotoUrl", returnPhotoUrl);

    try {
      await processLoanReturn(fd);
      setReturnModalLoan(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar la devolución.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  // Filtrado de equipos
  const filteredEquipment = initialEquipment.filter((eq) => {
    if (selectedCategory !== "all" && eq.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && eq.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        eq.name.toLowerCase().includes(q) ||
        eq.code.toLowerCase().includes(q) ||
        eq.brand.toLowerCase().includes(q) ||
        (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Métricas del inventario
  const totalCount = initialEquipment.length;
  const availableCount = initialEquipment.filter((e) => e.status === "Disponible").length;
  const loanedCount = initialEquipment.filter((e) => e.status === "Prestado").length;
  const maintenanceCount = initialEquipment.filter((e) => e.status === "En Mantenimiento").length;

  // Préstamos activos vs historial
  const activeLoans = initialLoans.filter(
    (l) => l.status === "Solicitado" || l.status === "Aprobado" || l.status === "Entregado"
  );
  const closedLoans = initialLoans.filter(
    (l) => l.status === "Devuelto" || l.status === "Devuelto con Novedad" || l.status === "Rechazado"
  );

  return (
    <div className="space-y-6">
      {/* Barra de Control y Selector de Pestañas */}
      <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/70 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                activeTab === "inventory"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-blue-950 border-blue-300 hover:bg-blue-100"
              }`}
            >
              Catálogo e Inventario ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activeLoans")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                activeTab === "activeLoans"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-blue-950 border-blue-300 hover:bg-blue-100"
              }`}
            >
              Préstamos en Curso ({activeLoans.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                activeTab === "history"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-blue-950 border-blue-300 hover:bg-blue-100"
              }`}
            >
              Historial de Actas ({closedLoans.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canManage && activeTab === "inventory" && (
              <button
                type="button"
                onClick={openCreateEquipmentModal}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                + Registrar Equipo
              </button>
            )}
            <button
              type="button"
              onClick={openLoanModal}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              + Solicitar Préstamo
            </button>
          </div>
        </div>

        {/* Resumen de Métricas de Inventario */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">Total Activos</span>
            <span className="text-xl font-bold text-blue-950 font-mono">{totalCount}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">Disponibles</span>
            <span className="text-xl font-bold text-emerald-800 font-mono">{availableCount}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">En Préstamo</span>
            <span className="text-xl font-bold text-blue-900 font-mono">{loanedCount}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <span className="text-[11px] text-slate-500 block">En Mantenimiento</span>
            <span className="text-xl font-bold text-amber-800 font-mono">{maintenanceCount}</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          PESTAÑA 1: INVENTARIO DE EQUIPOS
          ============================================================ */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Buscar Equipo</label>
              <input
                type="text"
                placeholder="Nombre, código, marca o serie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado Operativo</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="Disponible">Disponible</option>
                <option value="Prestado">Prestado</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Cuadrícula de Equipos */}
          {filteredEquipment.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-blue-200 text-center text-xs text-slate-600">
              No se encontraron equipos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {eq.code}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          eq.status === "Disponible"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : eq.status === "Prestado"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}
                      >
                        {eq.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-blue-950 leading-tight">
                      {eq.name}
                    </h3>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Categoría:</span> {eq.category}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Marca / Modelo:</span> {eq.brand} {eq.model ? `• ${eq.model}` : ""}
                      </div>
                      {eq.serialNumber && (
                        <div>
                          <span className="font-semibold text-slate-700">Serie:</span> <span className="font-mono">{eq.serialNumber}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-700">Estado Físico:</span> {eq.physicalCondition}
                      </div>
                      {eq.location && (
                        <div>
                          <span className="font-semibold text-slate-700">Ubicación:</span> {eq.location}
                        </div>
                      )}
                      {eq.accessories && (
                        <div className="pt-1 border-t border-slate-100">
                          <span className="font-semibold text-slate-700 block text-[11px]">Accesorios incluidos:</span>
                          <span className="text-[11px] text-slate-600 italic block">
                            {eq.accessories}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteEquipment(eq.id)}
                        className="text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditEquipmentModal(eq)}
                        className="px-3 py-1 rounded bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 font-semibold text-[11px]"
                      >
                        Editar Equipo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PESTAÑA 2: PRÉSTAMOS EN CURSO Y SOLICITUDES
          ============================================================ */}
      {activeTab === "activeLoans" && (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-blue-200 text-center text-xs text-slate-600">
              No hay préstamos activos ni solicitudes pendientes en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => {
                const now = new Date();
                const isOverdue =
                  loan.status === "Entregado" && now > new Date(loan.expectedReturnDate);

                return (
                  <div
                    key={loan.id}
                    className={`bg-white p-4 rounded-xl border transition-colors shadow-2xs space-y-3 ${
                      isOverdue ? "border-rose-400 ring-1 ring-rose-300" : "border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-900 block">
                          {loan.folio}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Custodio: <strong className="text-slate-800">{loan.borrower.name}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Vencido
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            loan.status === "Entregado"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="text-xs text-slate-800">
                      <span className="font-semibold text-slate-700 block">Motivo / Proyecto:</span>
                      <p className="leading-relaxed bg-blue-50/50 p-2 rounded border border-blue-100 mt-0.5">
                        {loan.purpose}
                      </p>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Fecha Salida</span>
                        <span className="font-bold text-blue-950">
                          {new Date(loan.startDate).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Devolución Estimada</span>
                        <span className={`font-bold ${isOverdue ? "text-rose-800" : "text-blue-950"}`}>
                          {new Date(loan.expectedReturnDate).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Equipos incluidos en el préstamo */}
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-slate-700 block">
                        Equipos en préstamo ({loan.items.length}):
                      </span>
                      <div className="space-y-1">
                        {loan.items.map((it) => (
                          <div
                            key={it.id}
                            className="p-1.5 rounded bg-blue-50/70 border border-blue-200 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-bold text-blue-950">
                              {it.equipment.name}
                            </span>
                            <span className="font-mono text-slate-600">
                              {it.equipment.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botones de acción y Actas con Firma Digital */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Indicador F-MKT-01 */}
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/marketing/equipment/actas/${loan.id}?format=F-MKT-01`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                              loan.departureDeliveredSignedAt && loan.departureReceivedSignedAt
                                ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                                : loan.departureDeliveredSignedAt || loan.departureReceivedSignedAt
                                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                            }`}
                            title="Abrir acta oficial F-MKT-01 y firmar digitalmente"
                          >
                            <span>F-MKT-01 (Entrega)</span>
                            <span className="text-[10px] font-mono">
                              {loan.departureDeliveredSignedAt && loan.departureReceivedSignedAt
                                ? "✓ 2/2"
                                : loan.departureDeliveredSignedAt || loan.departureReceivedSignedAt
                                ? "⏳ 1/2"
                                : "Pendiente"}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setActaModalLoan({ loan, type: "F-MKT-01" })}
                            className="p-1 text-slate-400 hover:text-blue-700 text-xs"
                            title="Vista previa rápida"
                          >
                            👁️
                          </button>
                        </div>

                        {/* Indicador F-MKT-02 */}
                        {loan.status === "Entregado" && (
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/marketing/equipment/actas/${loan.id}?format=F-MKT-02`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                loan.returnDeliveredSignedAt && loan.returnReceivedSignedAt
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                                  : loan.returnDeliveredSignedAt || loan.returnReceivedSignedAt
                                  ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                              }`}
                              title="Abrir acta oficial F-MKT-02 y firmar digitalmente"
                            >
                              <span>F-MKT-02 (Devolución)</span>
                              <span className="text-[10px] font-mono">
                                {loan.returnDeliveredSignedAt && loan.returnReceivedSignedAt
                                  ? "✓ 2/2"
                                  : loan.returnDeliveredSignedAt || loan.returnReceivedSignedAt
                                  ? "⏳ 1/2"
                                  : "Pendiente"}
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setActaModalLoan({ loan, type: "F-MKT-02" })}
                              className="p-1 text-slate-400 hover:text-blue-700 text-xs"
                              title="Vista previa rápida"
                            >
                              👁️
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {loan.status === "Solicitado" && canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliverModalLoan(loan);
                              setLoanDepartureNotes(loan.departureNotes || "");
                              setLoanDeparturePhotoUrl(loan.departurePhotoUrl || "");
                            }}
                            className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-2xs"
                          >
                            Autorizar y Entregar
                          </button>
                        )}

                        {loan.status === "Entregado" && canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnModalLoan(loan);
                              setReturnHasIssues(false);
                              setReturnNotes("");
                              setReturnPhotoUrl("");
                            }}
                            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs"
                          >
                            Registrar Devolución
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PESTAÑA 3: HISTORIAL DE PRÉSTAMOS
          ============================================================ */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          {closedLoans.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-600">
              No hay préstamos cerrados en el historial todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100/70 text-blue-950 font-bold border-b border-blue-200">
                    <th className="p-3">Folio</th>
                    <th className="p-3">Custodio</th>
                    <th className="p-3">Motivo / Proyecto</th>
                    <th className="p-3">Fecha Salida</th>
                    <th className="p-3">Fecha Devolución</th>
                    <th className="p-3">Equipos</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Actas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-slate-800">
                  {closedLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-950 whitespace-nowrap">
                        {loan.folio}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                        {loan.borrower.name}
                      </td>
                      <td className="p-3 max-w-xs truncate">{loan.purpose}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {new Date(loan.startDate).toLocaleDateString("es-ES")}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {loan.actualReturnDate
                          ? new Date(loan.actualReturnDate).toLocaleDateString("es-ES")
                          : "-"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {loan.items.map((i) => i.equipment.name).join(", ")}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            loan.status === "Devuelto"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                        <Link
                          href={`/marketing/equipment/actas/${loan.id}?format=F-MKT-01`}
                          className={`inline-block px-2.5 py-1 rounded font-semibold text-[11px] border transition-colors ${
                            loan.departureDeliveredSignedAt && loan.departureReceivedSignedAt
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                              : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                          }`}
                          title="Abrir acta de entrega F-MKT-01"
                        >
                          F-MKT-01 {loan.departureDeliveredSignedAt && loan.departureReceivedSignedAt ? "✓" : ""}
                        </Link>
                        <Link
                          href={`/marketing/equipment/actas/${loan.id}?format=F-MKT-02`}
                          className={`inline-block px-2.5 py-1 rounded font-semibold text-[11px] border transition-colors ${
                            loan.returnDeliveredSignedAt && loan.returnReceivedSignedAt
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                              : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title="Abrir acta de devolución F-MKT-02"
                        >
                          F-MKT-02 {loan.returnDeliveredSignedAt && loan.returnReceivedSignedAt ? "✓" : ""}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL 1: REGISTRAR / EDITAR EQUIPO
          ============================================================ */}
      {equipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                {editingEquipment ? "Editar Equipo de Inventario" : "Registrar Nuevo Equipo Audiovisual"}
              </h3>
              <button
                type="button"
                onClick={() => setEquipmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código de Inventario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: EQ-MKT-001 (Automático si se deja vacío)"
                    value={eqCode}
                    onChange={(e) => setEqCode(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={eqCategory}
                    onChange={(e) => setEqCategory(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Equipo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cámara Sony Alpha 7 IV"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sony, DJI, Rode, Godox..."
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="ILCE-7M4"
                    value={eqModel}
                    onChange={(e) => setEqModel(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Número de Serie</label>
                  <input
                    type="text"
                    placeholder="S/N de fábrica"
                    value={eqSerial}
                    onChange={(e) => setEqSerial(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condición Física</label>
                  <select
                    value={eqCondition}
                    onChange={(e) => setEqCondition(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {PHYSICAL_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingEquipment && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Operativo</label>
                  <select
                    value={eqStatus}
                    onChange={(e) => setEqStatus(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Prestado">Prestado</option>
                    <option value="En Mantenimiento">En Mantenimiento</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ubicación Física</label>
                <input
                  type="text"
                  placeholder="Ej: Armario Audiovisual Marketing - Estante 2"
                  value={eqLocation}
                  onChange={(e) => setEqLocation(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accesorios Incluidos</label>
                <textarea
                  rows={2}
                  placeholder="Ej: 2 baterías, cargador doble, estuche rígido, tarjeta SD 128GB..."
                  value={eqAccessories}
                  onChange={(e) => setEqAccessories(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEquipmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : editingEquipment ? "Guardar Cambios" : "Crear Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: SOLICITUD DE PRÉSTAMO CON SELECCIÓN MÚLTIPLE
          ============================================================ */}
      {loanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                  Formato Oficial F-MKT-01
                </span>
                <h3 className="text-base font-bold text-blue-950">
                  Solicitud y Acta de Préstamo de Equipos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLoanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{activeUserName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">({activeUserEmail})</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                  ✓ Usuario en Sesión (Firmante)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo del Préstamo / Proyecto o Salida a Campo *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej: Grabación de video y fotografía de avance de obras en Proyecto Residencial Monte Azul..."
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha y Hora de Salida *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={loanStartDate}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setLoanStartDate(newStartDate);
                        if (loanExpectedReturnDate && loanExpectedReturnDate < newStartDate) {
                          setLoanExpectedReturnDate(newStartDate);
                        }
                      }}
                      className="w-2/3 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                    />
                    <input
                      type="time"
                      value={loanStartTime}
                      onChange={(e) => setLoanStartTime(e.target.value)}
                      className="w-1/3 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Devolución Comprometida *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      min={loanStartDate || todayStr}
                      value={loanExpectedReturnDate}
                      onChange={(e) => setLoanExpectedReturnDate(e.target.value)}
                      className="w-2/3 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                    />
                    <input
                      type="time"
                      value={loanExpectedReturnTime}
                      onChange={(e) => setLoanExpectedReturnTime(e.target.value)}
                      className="w-1/3 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Selección múltiple de equipos */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selección Múltiple de Equipos a Prestar * ({loanSelectedEquipments.length} seleccionados)
                </label>
                <div className="border border-blue-200 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1.5 bg-blue-50/40">
                  {initialEquipment
                    .filter((e) => e.status === "Disponible")
                    .map((eq) => {
                      const isSelected = loanSelectedEquipments.includes(eq.id);
                      return (
                        <div
                          key={eq.id}
                          onClick={() => {
                            if (isSelected) {
                              setLoanSelectedEquipments(
                                loanSelectedEquipments.filter((id) => id !== eq.id)
                              );
                            } else {
                              setLoanSelectedEquipments([...loanSelectedEquipments, eq.id]);
                            }
                          }}
                          className={`p-2 rounded border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-blue-100"
                          }`}
                        >
                          <div>
                            <span className="font-bold block">{eq.name}</span>
                            <span className={`text-[11px] block ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                              {eq.category} • {eq.brand} {eq.model || ""}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-bold">
                            {eq.code}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Solicitud Core Vinculada (Opcional)
                </label>
                <select
                  value={loanRequestId}
                  onChange={(e) => setLoanRequestId(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="">Ninguna</option>
                  {coreRequests.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.ticketNumber} - {req.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones de Entrega Inicial (F-MKT-01)
                </label>
                <textarea
                  rows={2}
                  placeholder="Baterías cargadas al 100%, lente limpio sin rayones, estuche completo..."
                  value={loanDepartureNotes}
                  onChange={(e) => setLoanDepartureNotes(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enlace a Evidencias Fotográficas de Entrega (Google Drive / Fotos Antes)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={loanDeparturePhotoUrl}
                  onChange={(e) => setLoanDeparturePhotoUrl(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLoanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Procesando..." : "Crear Solicitud de Préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: AUTORIZAR Y ENTREGAR EQUIPO (F-MKT-01)
          ============================================================ */}
      {deliverModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-blue-200 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                  Acta de Salida F-MKT-01
                </span>
                <h3 className="text-base font-bold text-blue-950">
                  Autorización y Entrega Física
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeliverModalLoan(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthorizeDeliver} className="space-y-3">
              <p className="text-slate-700">
                Está a punto de formalizar la entrega de <strong>{deliverModalLoan.items.length} equipo(s)</strong> a nombre de <strong>{deliverModalLoan.borrower.name}</strong> bajo el folio <strong>{deliverModalLoan.folio}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas de Entrega e Inspección Inicial
                </label>
                <textarea
                  rows={2}
                  placeholder="Confirmación de estado físico, baterías y accesorios entregados a satisfacción..."
                  value={loanDepartureNotes}
                  onChange={(e) => setLoanDepartureNotes(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enlace a Evidencia Fotográfica Antes de Salir (Drive)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={loanDeparturePhotoUrl}
                  onChange={(e) => setLoanDeparturePhotoUrl(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeliverModalLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Firmar Entrega y Pasar a Prestado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: REGISTRAR DEVOLUCIÓN E INSPECCIÓN (F-MKT-02)
          ============================================================ */}
      {returnModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-blue-200 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Acta de Recepción F-MKT-02
                </span>
                <h3 className="text-base font-bold text-blue-950">
                  Devolución e Inspección Técnica
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalLoan(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-3">
              <p className="text-slate-700">
                Recepción e inspección física de los equipos del préstamo <strong>{returnModalLoan.folio}</strong> entregados por <strong>{returnModalLoan.borrower.name}</strong>.
              </p>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-950">
                  <input
                    type="checkbox"
                    checked={returnHasIssues}
                    onChange={(e) => setReturnHasIssues(e.target.checked)}
                    className="rounded border-blue-300 text-blue-700 focus:ring-blue-500"
                  />
                  <span>¿Se detectó alguna novedad, daño o faltante en los equipos?</span>
                </label>
                {returnHasIssues && (
                  <p className="text-[11px] text-amber-800">
                    Los equipos pasarán automáticamente a estado &quot;En Mantenimiento&quot; para su revisión técnica.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones de Devolución e Inspección *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Indique el estado de recepción de los equipos, limpieza, accesorios devueltos o novedades encontradas..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enlace a Evidencia Fotográfica Posterior (Fotos Después)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={returnPhotoUrl}
                  onChange={(e) => setReturnPhotoUrl(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Firmar Devolución e Ingresar a Inventario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 5: VISOR Y GENERADOR DE ACTA OFICIAL (F-MKT-01 / F-MKT-02)
          ============================================================ */}
      {actaModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-6 border border-blue-200 shadow-2xl max-h-[92vh] overflow-y-auto text-xs print:p-0 print:border-none print:shadow-none">
            {/* Encabezado del Acta */}
            <div className="flex items-center justify-between border-b-2 border-blue-950 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
                  MA
                </span>
                <div>
                  <h2 className="text-base font-bold text-blue-950">
                    MONTE AZUL SUITE — GESTIÓN AUDIOVISUAL
                  </h2>
                  <span className="text-[11px] text-slate-600 font-semibold block">
                    Área de Marketing y Comunicaciones
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-blue-950 block font-mono">
                  {actaModalLoan.type === "F-MKT-01"
                    ? "FORMATO F-MKT-01"
                    : "FORMATO F-MKT-02"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {actaModalLoan.type === "F-MKT-01"
                    ? "Acta de Entrega y Préstamo de Equipos"
                    : "Acta de Devolución e Inspección Técnica"}
                </span>
                <span className="text-[10px] font-mono text-blue-900 font-bold block mt-0.5">
                  Folio: {actaModalLoan.loan.folio}
                </span>
              </div>
            </div>

            {/* Datos del Préstamo y Custodio */}
            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200 text-xs">
              <div>
                <span className="text-slate-500 block">Custodio Responsable:</span>
                <span className="font-bold text-blue-950 block">
                  {actaModalLoan.loan.borrower.name}
                </span>
                <span className="text-[11px] text-slate-600 block">
                  {actaModalLoan.loan.borrower.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Autorizado Por:</span>
                <span className="font-bold text-blue-950 block">
                  {actaModalLoan.loan.authorizedBy?.name || "Dirección de Marketing"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha de Salida / Entrega:</span>
                <span className="font-bold text-blue-950">
                  {new Date(actaModalLoan.loan.startDate).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">
                  {actaModalLoan.type === "F-MKT-01"
                    ? "Fecha Comprometida de Devolución:"
                    : "Fecha Real de Devolución:"}
                </span>
                <span className="font-bold text-blue-950">
                  {actaModalLoan.type === "F-MKT-01"
                    ? new Date(actaModalLoan.loan.expectedReturnDate).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : actaModalLoan.loan.actualReturnDate
                    ? new Date(actaModalLoan.loan.actualReturnDate).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Pendiente de devolución"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Motivo / Proyecto:</span>
                <span className="font-medium text-slate-800 block">
                  {actaModalLoan.loan.purpose}
                </span>
              </div>
            </div>

            {/* Tabla de Equipos Prestados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                Relación de Equipos y Accesorios Entregados
              </h4>
              <table className="w-full text-left text-xs border border-blue-200">
                <thead>
                  <tr className="bg-blue-100/70 text-blue-950 font-bold border-b border-blue-200">
                    <th className="p-2 border-r border-blue-200">Código</th>
                    <th className="p-2 border-r border-blue-200">Equipo</th>
                    <th className="p-2 border-r border-blue-200">Serie</th>
                    <th className="p-2 border-r border-blue-200">Estado Físico</th>
                    <th className="p-2">Accesorios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {actaModalLoan.loan.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2 font-mono font-bold text-blue-900 border-r border-blue-100">
                        {it.equipment.code}
                      </td>
                      <td className="p-2 border-r border-blue-100">
                        <span className="font-semibold text-blue-950 block">
                          {it.equipment.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {it.equipment.brand} {it.equipment.model || ""}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-[11px] border-r border-blue-100">
                        {it.equipment.serialNumber || "N/A"}
                      </td>
                      <td className="p-2 border-r border-blue-100">
                        {it.equipment.physicalCondition}
                      </td>
                      <td className="p-2 text-[11px] text-slate-600">
                        {it.equipment.accessories || "Estuche estándar"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observaciones y Evidencias */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-blue-950">
                Observaciones y Evidencias Técnicas
              </h4>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Observaciones Salida (F-MKT-01):</span>{" "}
                  <span className="text-slate-800">
                    {actaModalLoan.loan.departureNotes || "Sin novedades en la entrega."}
                  </span>
                </div>
                {actaModalLoan.loan.departurePhotoUrl && (
                  <div>
                    <span className="font-semibold text-slate-700">Evidencias Salida:</span>{" "}
                    <a
                      href={actaModalLoan.loan.departurePhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline font-semibold"
                    >
                      Consultar Fotos de Salida (Drive) ↗
                    </a>
                  </div>
                )}
                {actaModalLoan.type === "F-MKT-02" && (
                  <>
                    <div className="pt-1 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Observaciones Recepción (F-MKT-02):</span>{" "}
                      <span className="text-slate-800">
                        {actaModalLoan.loan.returnNotes || "Equipos recibidos a satisfacción."}
                      </span>
                    </div>
                    {actaModalLoan.loan.returnPhotoUrl && (
                      <div>
                        <span className="font-semibold text-slate-700">Evidencias Retorno:</span>{" "}
                        <a
                          href={actaModalLoan.loan.returnPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline font-semibold"
                        >
                          Consultar Fotos de Recepción (Drive) ↗
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cláusula de Custodia */}
            <div className="text-[10px] text-slate-600 bg-blue-50/40 p-2.5 rounded border border-blue-200 leading-relaxed italic">
              El custodio declara recibir los equipos relacionados en óptimas condiciones de funcionamiento y se compromete a su cuidado, uso exclusivo para los fines corporativos autorizados y restitución en la fecha acordada.
            </div>

            {/* Firmas Formales */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-slate-400 h-10 w-3/4 mx-auto" />
                <span className="font-bold text-blue-950 block">
                  {actaModalLoan.loan.borrower.name}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Firma Custodio / Solicitante
                </span>
              </div>
              <div className="space-y-1">
                <div className="border-b border-slate-400 h-10 w-3/4 mx-auto" />
                <span className="font-bold text-blue-950 block">
                  {actaModalLoan.loan.authorizedBy?.name || "Dirección de Marketing"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Firma Autorización / Entrega
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 print:hidden">
              <Link
                href={`/marketing/equipment/actas/${actaModalLoan.loan.id}?format=${actaModalLoan.type}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <span>🖋️ Abrir Acta Completa y Firmar Digitalmente</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActaModalLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs"
                >
                  Imprimir / Guardar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
