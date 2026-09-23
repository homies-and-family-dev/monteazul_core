"use client";

import React, { useState, useTransition } from "react";
import {
  createCommercialBooking,
  updateCommercialBookingStatus,
  updateCommercialBooking,
  deleteCommercialBooking,
} from "./actions";

export interface CommercialBookingItem {
  id: string;
  project: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  numAttendees: number;
  date: Date;
  durationMinutes: number;
  status: string;
  notes: string | null;
  transportNeed: boolean;
  feedbackNotes: string | null;
  assignedAdvisorId: string | null;
  assignedAdvisor: { id: string; name: string; email: string } | null;
  createdById: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: Date;
}

interface Props {
  initialBookings: CommercialBookingItem[];
  advisors: Array<{ id: string; name: string; email: string }>;
  canEdit: boolean;
}

const PROJECTS = [
  "Monteazul Club Náutico",
  "Golf Club",
  "Reservas de Prado",
  "Pirate Paradise",
  "Las Victorias",
  "Otro Proyecto",
];

const TIME_SLOTS = [
  { value: "08:00", label: "08:00 AM - 09:30 AM" },
  { value: "09:30", label: "09:30 AM - 11:00 AM" },
  { value: "11:00", label: "11:00 AM - 12:30 PM" },
  { value: "13:30", label: "01:30 PM - 03:00 PM" },
  { value: "15:00", label: "03:00 PM - 04:30 PM" },
  { value: "16:30", label: "04:30 PM - 06:00 PM" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  AGENDADA: {
    label: "Agendada",
    bg: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-300",
  },
  CONFIRMADA: {
    label: "Confirmada",
    bg: "bg-sky-100",
    text: "text-sky-900",
    border: "border-sky-300",
  },
  REALIZADA: {
    label: "Realizada",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
  },
  REPROGRAMADA: {
    label: "Reprogramada",
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
  },
  CANCELADA: {
    label: "Cancelada",
    bg: "bg-rose-100",
    text: "text-rose-900",
    border: "border-rose-300",
  },
  NO_ASISTIO: {
    label: "No Asistió",
    bg: "bg-slate-200",
    text: "text-slate-800",
    border: "border-slate-300",
  },
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function CommercialScheduleView({
  initialBookings,
  advisors,
  canEdit,
}: Props) {
  const [bookings, setBookings] = useState<CommercialBookingItem[]>(initialBookings);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");

  // Filtros
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterAdvisor, setFilterAdvisor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CommercialBookingItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de formulario nuevo agendamiento (zcal replica)
  const [newProject, setNewProject] = useState(PROJECTS[0]);
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [newTimeSlot, setNewTimeSlot] = useState("09:30");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newNumAttendees, setNewNumAttendees] = useState(1);
  const [newTransportNeed, setNewTransportNeed] = useState(false);
  const [newAssignedAdvisorId, setNewAssignedAdvisorId] = useState(advisors[0]?.id || "");
  const [newNotes, setNewNotes] = useState("");

  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Filtrado de agendamientos
  const filteredBookings = bookings.filter((b) => {
    if (filterProject !== "ALL" && b.project !== filterProject) return false;
    if (filterStatus !== "ALL" && b.status !== filterStatus) return false;
    if (filterAdvisor !== "ALL" && b.assignedAdvisorId !== filterAdvisor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.clientName.toLowerCase().includes(q);
      const matchPhone = b.clientPhone.toLowerCase().includes(q);
      const matchEmail = b.clientEmail.toLowerCase().includes(q);
      const matchProject = b.project.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail && !matchProject) return false;
    }
    return true;
  });

  // Métricas
  const totalCount = bookings.length;
  const agendadasCount = bookings.filter((b) => b.status === "AGENDADA" || b.status === "CONFIRMADA").length;
  const realizadasCount = bookings.filter((b) => b.status === "REALIZADA").length;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const thisWeekCount = bookings.filter((b) => {
    const d = new Date(b.date);
    return d >= startOfWeek && d < endOfWeek;
  }).length;

  // Navegación de mes / semana
  const handlePrev = () => {
    if (viewMode === "month") {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(prev);
    } else if (viewMode === "week") {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(next);
    } else if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Creación de Agendamiento
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.set("project", newProject);
    formData.set("clientName", newClientName);
    formData.set("clientEmail", newClientEmail);
    formData.set("clientPhone", newClientPhone);
    formData.set("numAttendees", String(newNumAttendees));
    formData.set("date", newDate);
    formData.set("timeSlot", newTimeSlot);
    formData.set("transportNeed", newTransportNeed ? "true" : "false");
    formData.set("assignedAdvisorId", newAssignedAdvisorId);
    formData.set("notes", newNotes);

    startTransition(async () => {
      try {
        const res = await createCommercialBooking(formData);
        if (res.success) {
          // Agregar optimísticamente
          const advisorObj = advisors.find((a) => a.id === newAssignedAdvisorId) || null;
          const newBookingItem: CommercialBookingItem = {
            id: res.bookingId,
            project: newProject,
            clientName: newClientName,
            clientEmail: newClientEmail,
            clientPhone: newClientPhone,
            numAttendees: newNumAttendees,
            date: new Date(`${newDate}T${newTimeSlot}:00`),
            durationMinutes: 90,
            status: "AGENDADA",
            notes: newNotes || null,
            transportNeed: newTransportNeed,
            feedbackNotes: null,
            assignedAdvisorId: newAssignedAdvisorId || null,
            assignedAdvisor: advisorObj,
            createdById: null,
            createdBy: null,
            createdAt: new Date(),
          };
          setBookings((prev) => [...prev, newBookingItem]);
          setIsNewModalOpen(false);
          // Reset
          setNewClientName("");
          setNewClientEmail("");
          setNewClientPhone("");
          setNewNumAttendees(1);
          setNewNotes("");
          setNewTransportNeed(false);
        }
      } catch (err: any) {
        setFormError(err.message || "Error al registrar la visita.");
      }
    });
  };

  // Cambio de estado
  const handleStatusChange = (bookingId: string, status: string, feedbackNotes?: string) => {
    const formData = new FormData();
    formData.set("id", bookingId);
    formData.set("status", status);
    if (feedbackNotes !== undefined) {
      formData.set("feedbackNotes", feedbackNotes);
    }

    startTransition(async () => {
      try {
        await updateCommercialBookingStatus(formData);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status,
                  ...(feedbackNotes !== undefined ? { feedbackNotes } : {}),
                }
              : b
          )
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) =>
            prev
              ? {
                  ...prev,
                  status,
                  ...(feedbackNotes !== undefined ? { feedbackNotes } : {}),
                }
              : null
          );
        }
      } catch (err: any) {
        alert(err.message || "Error al actualizar el estado.");
      }
    });
  };

  // Eliminación
  const handleDeleteBooking = (bookingId: string) => {
    if (!confirm("¿Está seguro de eliminar esta cita de visita a terreno?")) return;
    const formData = new FormData();
    formData.set("id", bookingId);

    startTransition(async () => {
      try {
        await deleteCommercialBooking(formData);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        setSelectedBooking(null);
      } catch (err: any) {
        alert(err.message || "Error al eliminar.");
      }
    });
  };

  // Render cuadrícula del mes
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayIndex = (firstDay.getDay() + 6) % 7; // Lunes = 0
    const totalDays = lastDay.getDate();

    const days = [];
    // Días vacíos del mes anterior
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Días del mes actual
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    const todayStr = new Date().toISOString().split("T")[0];

    return (
      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-2xs">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-blue-200 bg-blue-50/80 text-center text-xs font-bold text-blue-950 uppercase tracking-wider py-3">
          {DAY_NAMES.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>

        {/* Celdas del calendario */}
        <div className="grid grid-cols-7 divide-x divide-y divide-blue-100 min-h-[500px]">
          {days.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="bg-slate-50/60 p-2 min-h-[100px]"
                />
              );
            }

            const dayStr = day.toISOString().split("T")[0];
            const isToday = dayStr === todayStr;

            // Filtrar agendamientos de este día
            const dayBookings = filteredBookings.filter((b) => {
              const bStr = new Date(b.date).toISOString().split("T")[0];
              return bStr === dayStr;
            });

            return (
              <div
                key={dayStr}
                onClick={() => {
                  setNewDate(dayStr);
                  setIsNewModalOpen(true);
                }}
                className={`p-2 min-h-[110px] hover:bg-blue-50/40 transition-colors flex flex-col justify-between cursor-pointer group ${
                  isToday ? "bg-blue-50/60" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-blue-700 text-white font-bold"
                        : "text-slate-700 group-hover:text-blue-900"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded-full">
                      {dayBookings.length} {dayBookings.length === 1 ? "visita" : "visitas"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[85px] flex-1">
                  {dayBookings.map((b) => {
                    const st = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.AGENDADA;
                    const dateObj = new Date(b.date);
                    const hours = String(dateObj.getHours()).padStart(2, "0");
                    const mins = String(dateObj.getMinutes()).padStart(2, "0");

                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium border truncate transition-all shadow-2xs hover:scale-[1.01] ${st.bg} ${st.text} ${st.border}`}
                        title={`${b.clientName} (${b.project}) - ${hours}:${mins}`}
                      >
                        <span className="font-bold mr-1">
                          {hours}:{mins}
                        </span>
                        <span>{b.clientName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Vista Listado
  const renderListView = () => {
    return (
      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-2xs">
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              No hay visitas agendadas con los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Haga clic en &quot;+ Agendar Visita a Terreno&quot; para registrar una nueva cita.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50/80 font-bold text-blue-950 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Fecha y Horario</th>
                  <th className="px-5 py-3.5">Proyecto</th>
                  <th className="px-5 py-3.5">Cliente y Asistentes</th>
                  <th className="px-5 py-3.5">Contacto / WhatsApp</th>
                  <th className="px-5 py-3.5">Asesor Asignado</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {filteredBookings.map((b) => {
                  const st = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.AGENDADA;
                  const dateObj = new Date(b.date);
                  const dateStr = dateObj.toLocaleDateString("es-CO", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const timeStr = dateObj.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block capitalize">
                          {dateStr}
                        </span>
                        <span className="text-[11px] text-blue-700 font-semibold font-mono">
                          {timeStr} (90 min)
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-blue-950 block">
                          {b.project}
                        </span>
                        {b.transportNeed && (
                          <span className="inline-block mt-0.5 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Requiere Transporte
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 block text-xs">
                          {b.clientName}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {b.numAttendees} {b.numAttendees === 1 ? "persona" : "personas"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-medium text-slate-800 block">
                          {b.clientPhone}
                        </span>
                        {b.clientEmail && (
                          <span className="text-slate-500 text-[11px] block truncate max-w-[180px]">
                            {b.clientEmail}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                        {b.assignedAdvisor ? (
                          <span className="font-medium text-slate-900">
                            {b.assignedAdvisor.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin asignar</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-semibold border ${st.bg} ${st.text} ${st.border}`}
                        >
                          {st.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(b);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                        >
                          Ver Detalle →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
              Área Comercial
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Tablero de Agendamiento — Visitas a Terreno
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Coordinación, calendario y seguimiento de visitas guiadas de clientes a los proyectos inmobiliarios
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agendar Visita a Terreno
        </button>
      </div>

      {/* TARJETAS DE INDICADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Total Visitas
          </span>
          <p className="text-2xl font-bold text-blue-950 mt-1">{totalCount}</p>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Agendadas y Confirmadas
          </span>
          <p className="text-2xl font-bold text-sky-800 mt-1">{agendadasCount}</p>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Esta Semana
          </span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{thisWeekCount}</p>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Visitas Realizadas
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{realizadasCount}</p>
        </div>
      </div>

      {/* BARRA DE FILTROS Y CONTROLES DE NAVEGACIÓN */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Navegación Mes / Semana */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 font-bold transition-colors cursor-pointer"
              title="Anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 font-bold transition-colors cursor-pointer"
              title="Siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-semibold text-blue-900 transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <span className="text-base font-bold text-blue-950 ml-2">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </div>

          {/* Toggle de vistas: Mes / Lista */}
          <div className="flex items-center rounded-lg border border-blue-200 bg-white p-0.5 shadow-2xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-blue-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-blue-950"
              }`}
            >
              Calendario Mes
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-blue-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-blue-950"
              }`}
            >
              Listado Cronológico
            </button>
          </div>
        </div>

        {/* Filtros Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-200/60">
          <div>
            <label className="block text-[11px] font-semibold text-blue-950 mb-1">
              Filtrar Proyecto
            </label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full text-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">Todos los Proyectos</option>
              {PROJECTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-blue-950 mb-1">
              Filtrar Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">Todos los Estados</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-blue-950 mb-1">
              Asesor Asignado
            </label>
            <select
              value={filterAdvisor}
              onChange={(e) => setFilterAdvisor(e.target.value)}
              className="w-full text-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">Todos los Asesores</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-blue-950 mb-1">
              Buscar Cliente / Teléfono
            </label>
            <input
              type="text"
              placeholder="Buscar por cliente o WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-blue-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN MODO DE VISTA */}
      {viewMode === "month" ? renderMonthView() : renderListView()}

      {/* ======================================================== */}
      {/* MODAL 1: NUEVO AGENDAMIENTO DE VISITA (FLUJO ZCAL)      */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setIsNewModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Flujo de Agendamiento
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Agendar Visita a Terreno (90 min)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateBooking} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Proyecto */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Proyecto de Interés *
                </label>
                <select
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {PROJECTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Franja Horaria (slots 90 min) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Fecha de la Visita *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Franja Horaria (90 min) *
                  </label>
                  <select
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Encuesta de Contacto (zcal/contact replicate) */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-3">
                  Datos del Cliente y Encuesta de Asistencia
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Nombre Completo del Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Martínez"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. +57 300 123 4567"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="cliente@ejemplo.com"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Número de Asistentes
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={newNumAttendees}
                        onChange={(e) => setNewNumAttendees(parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Asesor Comercial Asignado
                      </label>
                      <select
                        value={newAssignedAdvisorId}
                        onChange={(e) => setNewAssignedAdvisorId(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Sin Asignar</option>
                        {advisors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Requiere transporte */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTransportNeed}
                      onChange={(e) => setNewTransportNeed(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      ¿El cliente requiere transporte coordinado por Monteazul?
                    </span>
                  </label>

                  {/* Notas previas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Notas u Observaciones Previas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Comentarios adicionales del cliente, solicitudes especiales..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  {isPending ? "Agendando..." : "Confirmar Agendamiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DETALLE Y SEGUIMIENTO DE LA VISITA             */}
      {/* ======================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedBooking(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_CONFIG[selectedBooking.status]?.bg ?? "bg-slate-100"
                  } ${STATUS_CONFIG[selectedBooking.status]?.text ?? "text-slate-800"} ${
                    STATUS_CONFIG[selectedBooking.status]?.border ?? "border-slate-300"
                  }`}
                >
                  {STATUS_CONFIG[selectedBooking.status]?.label ?? selectedBooking.status}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedBooking.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Detalle */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Información General */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Proyecto:</span>
                  <span className="font-bold text-blue-950">{selectedBooking.project}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Fecha y Horario:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedBooking.date).toLocaleDateString("es-CO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(selectedBooking.date).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Duración:</span>
                  <span className="font-medium text-slate-800">
                    {selectedBooking.durationMinutes} minutos
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Asistentes:</span>
                  <span className="font-medium text-slate-800">
                    {selectedBooking.numAttendees} {selectedBooking.numAttendees === 1 ? "persona" : "personas"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Transporte:</span>
                  <span
                    className={`font-semibold ${
                      selectedBooking.transportNeed ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {selectedBooking.transportNeed ? "Requiere Transporte" : "No requiere"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Asesor Asignado:</span>
                  <span className="font-bold text-blue-900">
                    {selectedBooking.assignedAdvisor?.name ?? "Sin Asignar"}
                  </span>
                </div>
              </div>

              {/* Contacto Directo */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Canales de Contacto</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/${selectedBooking.clientPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                  >
                    WhatsApp: {selectedBooking.clientPhone}
                  </a>
                  {selectedBooking.clientEmail && (
                    <a
                      href={`mailto:${selectedBooking.clientEmail}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-colors"
                    >
                      Email: {selectedBooking.clientEmail}
                    </a>
                  )}
                </div>
              </div>

              {/* Notas de la Encuesta Previa */}
              {selectedBooking.notes && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">
                    Notas Previas / Encuesta
                  </span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              {/* Notas de Seguimiento Comercial Posterior */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  Seguimiento Comercial y Feedback de la Visita
                </span>
                <textarea
                  rows={3}
                  placeholder="Registre aquí el resultado de la visita, nivel de interés, propuesta comercial..."
                  defaultValue={selectedBooking.feedbackNotes || ""}
                  onBlur={(e) => {
                    const text = e.target.value.trim();
                    if (text !== (selectedBooking.feedbackNotes || "")) {
                      handleStatusChange(selectedBooking.id, selectedBooking.status, text);
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-400 italic block">
                  Se guarda automáticamente al hacer clic fuera del campo.
                </span>
              </div>

              {/* Acciones de Cambio de Estado */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  Actualizar Estado de la Visita
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedBooking.status !== "CONFIRMADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "CONFIRMADA")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 transition-colors cursor-pointer"
                    >
                      Marcar Confirmada
                    </button>
                  )}
                  {selectedBooking.status !== "REALIZADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "REALIZADA")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      Marcar Realizada
                    </button>
                  )}
                  {selectedBooking.status !== "REPROGRAMADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "REPROGRAMADA")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Reprogramar
                    </button>
                  )}
                  {selectedBooking.status !== "CANCELADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "CANCELADA")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Cancelar Visita
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteBooking(selectedBooking.id)}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer"
              >
                Eliminar Cita
              </button>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
