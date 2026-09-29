"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  createCommercialBooking,
  updateCommercialBookingStatus,
  updateCommercialBooking,
  deleteCommercialBooking,
} from "./actions";
import { createCommercialQuote, type QuoteFormData } from "../quotes/actions";

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
  quotes?: Array<{
    id: string;
    consecutive: string;
    status: string;
    finalPrice: number;
    date: Date;
    projectName: string;
    lotNumber: string;
    dataValidated: boolean;
    contract?: { id: string; contractNumber: string; status: string } | null;
  }>;
  client?: {
    id: string;
    docType: string;
    docNumber: string | null;
    address: string | null;
    city: string | null;
    civilStatus: string | null;
    bank: string | null;
  } | null;
}

interface Props {
  initialBookings: CommercialBookingItem[];
  advisors: Array<{ id: string; name: string; email: string }>;
  projects?: Array<{
    id: string;
    name: string;
    defaultPricePerM2?: number;
    stages?: string[];
    blocks?: string[];
  }>;
  canEdit: boolean;
}

const DEFAULT_PROJECTS = [
  "Altos Las Victorias",
  "Club Náutico Monteazul",
  "Entre Montañas",
  "Golf Club Monteazul",
  "Llanos Las Victorias",
  "Monteverde del Restrepo",
  "Quintas Las Victorias",
  "Reservas de Prado",
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

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CommercialScheduleView({
  initialBookings,
  advisors,
  projects,
  canEdit,
}: Props) {
  const projectList =
    projects && projects.length > 0
      ? projects.map((p) => p.name)
      : DEFAULT_PROJECTS;

  const [bookings, setBookings] = useState<CommercialBookingItem[]>(initialBookings);

  useEffect(() => {
    setBookings(initialBookings);
    if (selectedBooking) {
      const updated = initialBookings.find((b) => b.id === selectedBooking.id);
      if (updated) {
        setSelectedBooking(updated);
      }
    }
  }, [initialBookings]);

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

  // Modal para Generación de Cotización desde Agendamiento
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteBooking, setQuoteBooking] = useState<CommercialBookingItem | null>(null);
  const [quoteFormData, setQuoteFormData] = useState<QuoteFormData>({
    projectName: "",
    stage: "Etapa 1",
    block: "Manzana A",
    lotNumber: "Lote 01",
    totalArea: 1000,
    pricePerSquareMeter: 185000,
    clientName: "",
    clientDocType: "CC",
    clientDocNumber: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    clientCity: "Ibagué",
    clientCivilStatus: "Soltero(a)",
    clientBank: "Bancolombia",
    clientParticipation: 100,
    hasSecondOptant: false,
    hasDiscount: false,
    discountAmount: 0,
    discountDescription: "",
    reservationAmount: 5000000,
    initialQuotaPercent: 10,
    installmentsCount: 12,
    observations: "",
    advisorId: "",
    bookingId: "",
  });
  const [quoteFormError, setQuoteFormError] = useState<string | null>(null);
  const [quoteSuccessNotice, setQuoteSuccessNotice] = useState<{
    quoteId: string;
    consecutive: string;
  } | null>(null);

  // Estados de formulario nuevo agendamiento (zcal replica)
  const [newProject, setNewProject] = useState(projectList[0] || "Club Náutico Monteazul");
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

  // Handlers para cotización desde agendamiento
  const openQuoteModalForBooking = (b: CommercialBookingItem) => {
    setQuoteFormError(null);
    setQuoteSuccessNotice(null);
    setQuoteBooking(b);

    const fullProjects = projects || [];
    const projConfig = fullProjects.find((p) => p.name === b.project);
    const defaultM2 = projConfig?.defaultPricePerM2 || 185000;
    const stage = projConfig?.stages?.[0] || "Etapa 1";
    const block = projConfig?.blocks?.[0] || "Manzana A";

    setQuoteFormData({
      projectName: b.project,
      stage,
      block,
      lotNumber: "Lote 01",
      totalArea: 1000,
      pricePerSquareMeter: defaultM2,
      clientName: b.clientName,
      clientDocType: b.client?.docType || "CC",
      clientDocNumber: b.client?.docNumber || "",
      clientPhone: b.clientPhone,
      clientEmail: b.clientEmail || "",
      clientAddress: b.client?.address || "",
      clientCity: b.client?.city || "Ibagué",
      clientCivilStatus: b.client?.civilStatus || "Soltero(a)",
      clientBank: b.client?.bank || "Bancolombia",
      clientParticipation: 100,
      hasSecondOptant: false,
      hasDiscount: false,
      discountAmount: 0,
      discountDescription: "",
      reservationAmount: 5000000,
      initialQuotaPercent: 10,
      installmentsCount: 12,
      observations:
        b.feedbackNotes ||
        b.notes ||
        `Cotización comercial generada a partir de visita a terreno cumplida el ${new Date(
          b.date
        ).toLocaleDateString("es-CO")}.`,
      advisorId: b.assignedAdvisorId || "",
      bookingId: b.id,
    });

    setShowQuoteModal(true);
  };

  const handleQuoteProjectChange = (projectName: string) => {
    const fullProjects = projects || [];
    const projConfig = fullProjects.find((p) => p.name === projectName);
    const defaultM2 = projConfig?.defaultPricePerM2 || quoteFormData.pricePerSquareMeter || 185000;
    const stage = projConfig?.stages?.[0] || "Etapa 1";
    const block = projConfig?.blocks?.[0] || "Manzana A";
    setQuoteFormData((prev) => ({
      ...prev,
      projectName,
      stage,
      block,
      pricePerSquareMeter: defaultM2,
    }));
  };

  const handleQuoteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuoteFormError(null);

    startTransition(async () => {
      try {
        const res = await createCommercialQuote(quoteFormData);
        if (!res.success || !res.quoteId) {
          throw new Error(res.error || "Error al crear la cotización");
        }

        const calculatedTotalPrice = Math.round(
          quoteFormData.totalArea * quoteFormData.pricePerSquareMeter
        );
        const calculatedFinalPrice = Math.max(
          0,
          calculatedTotalPrice -
            (quoteFormData.hasDiscount ? quoteFormData.discountAmount || 0 : 0)
        );

        const newQuoteObj = {
          id: res.quoteId,
          consecutive: res.consecutive!,
          status: "EMITIDA",
          finalPrice: calculatedFinalPrice,
          date: new Date(),
          projectName: quoteFormData.projectName,
          lotNumber: quoteFormData.lotNumber,
          dataValidated: false,
        };

        // Actualizar citas en el estado local marcando como REALIZADA y vinculando cotización
        setBookings((prev) =>
          prev.map((b) =>
            b.id === quoteFormData.bookingId
              ? {
                  ...b,
                  status: "REALIZADA",
                  quotes: [newQuoteObj, ...(b.quotes || [])],
                }
              : b
          )
        );

        if (selectedBooking && selectedBooking.id === quoteFormData.bookingId) {
          setSelectedBooking((prev) =>
            prev
              ? {
                  ...prev,
                  status: "REALIZADA",
                  quotes: [newQuoteObj, ...(prev.quotes || [])],
                }
              : null
          );
        }

        setQuoteSuccessNotice({
          quoteId: res.quoteId,
          consecutive: res.consecutive!,
        });
        setShowQuoteModal(false);
      } catch (err: any) {
        setQuoteFormError(err.message || "Error al crear la cotización.");
      }
    });
  };

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
              {projectList.map((p) => (
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
                  {projectList.map((p) => (
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

              {/* Notificación de Cotización Exitosa */}
              {quoteSuccessNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                    <div>
                      <span className="font-bold">¡Cotización {quoteSuccessNotice.consecutive} generada con éxito!</span>
                      <p className="text-[11px] text-emerald-800">
                        La propuesta comercial ha quedado vinculada a esta visita y al cliente para su seguimiento continuo.
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/commercial/quotes/${quoteSuccessNotice.quoteId}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    Ver Documento Oficial (PDF) →
                  </Link>
                </div>
              )}

              {/* Trazabilidad Comercial y Cotizaciones */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Trazabilidad y Cotizaciones Comerciales
                    </span>
                    {selectedBooking.quotes && selectedBooking.quotes.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {selectedBooking.quotes.length} {selectedBooking.quotes.length === 1 ? "propuesta" : "propuestas"}
                      </span>
                    )}
                  </div>

                  {/* Botón único de nueva cotización en cabecera SOLO cuando es REALIZADA y ya tiene cotizaciones previas */}
                  {selectedBooking.status === "REALIZADA" &&
                    selectedBooking.quotes &&
                    selectedBooking.quotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openQuoteModalForBooking(selectedBooking)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        + Nueva Cotización
                      </button>
                    )}
                </div>

                {/* Cuando la visita fue REALIZADA y aún no tiene cotizaciones: ÚNICO botón de cotizar */}
                {selectedBooking.status === "REALIZADA" &&
                  (!selectedBooking.quotes || selectedBooking.quotes.length === 0) && (
                    <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="text-xs text-emerald-950">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Visita Cumplida con Asistencia del Cliente
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                          La visita a terreno fue realizada. Inicie aquí la trazabilidad comercial generando la propuesta formal de cotización.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openQuoteModalForBooking(selectedBooking)}
                        className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Realizar Cotización
                      </button>
                    </div>
                  )}

                {/* Listado de Cotizaciones Asociadas */}
                {selectedBooking.quotes && selectedBooking.quotes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedBooking.quotes.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl border border-blue-200 bg-white hover:border-blue-400 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {q.consecutive}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {q.status}
                            </span>
                            {q.contract && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                Contrato {q.contract.contractNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-800">
                            {q.projectName} · {q.lotNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Valor: <strong className="text-blue-950 font-bold">{formatCOP(q.finalPrice)}</strong> · Fecha: {new Date(q.date).toLocaleDateString("es-CO")}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/commercial/quotes/${q.id}`}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            Ver Documento Oficial →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  selectedBooking.status !== "REALIZADA" && (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-1">
                      <div className="text-xs font-semibold text-slate-700">
                        {selectedBooking.status === "CONFIRMADA"
                          ? "Cita Confirmada · Pendiente Asistencia a Terreno"
                          : selectedBooking.status === "AGENDADA"
                          ? "Cita Agendada · Pendiente Confirmación"
                          : `Estado actual: ${STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}`}
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        {selectedBooking.status === "CONFIRMADA"
                          ? "Cuando el cliente asista y la visita se marque como Realizada, se activará en este espacio el botón para realizar la cotización."
                          : selectedBooking.status === "AGENDADA"
                          ? "Marque primero la visita como Confirmada. Una vez realizada la visita a terreno con el cliente, quedará habilitado el botón para cotizar."
                          : "Para generar una cotización formal asociada, la visita debe encontrarse en estado Realizada."}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Acciones de Cambio de Estado */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  Actualizar Estado de la Visita
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Flujo paso 1: De AGENDADA -> CONFIRMADA */}
                  {selectedBooking.status === "AGENDADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "CONFIRMADA")}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Marcar Confirmada
                    </button>
                  )}

                  {/* Flujo paso 2: De CONFIRMADA -> REALIZADA (Cliente asistió a terreno) */}
                  {selectedBooking.status === "CONFIRMADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "REALIZADA")}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Marcar como Realizada (Cliente Asistió a Terreno)
                    </button>
                  )}

                  {/* Si ya es REALIZADA: Indicador y opción de revertir */}
                  {selectedBooking.status === "REALIZADA" && (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                        <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Asistencia Cumplida en Terreno
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedBooking.id, "CONFIRMADA")}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                      >
                        Revertir a Confirmada
                      </button>
                    </>
                  )}

                  {/* Opciones complementarias según estado */}
                  {selectedBooking.status === "CONFIRMADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "NO_ASISTIO")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                    >
                      No Asistió
                    </button>
                  )}

                  {selectedBooking.status === "CONFIRMADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "AGENDADA")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                    >
                      Revertir a Agendada
                    </button>
                  )}

                  {selectedBooking.status !== "REPROGRAMADA" && selectedBooking.status !== "CANCELADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "REPROGRAMADA")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Reprogramar
                    </button>
                  )}

                  {selectedBooking.status !== "CANCELADA" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedBooking.id, "CANCELADA")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Cancelar Visita
                    </button>
                  )}

                  {/* Si está CANCELADA, REPROGRAMADA o NO_ASISTIO: permitir reactivar */}
                  {(selectedBooking.status === "CANCELADA" ||
                    selectedBooking.status === "REPROGRAMADA" ||
                    selectedBooking.status === "NO_ASISTIO") && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedBooking.id, "AGENDADA")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        Reactivar como Agendada
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedBooking.id, "CONFIRMADA")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 transition-colors cursor-pointer"
                      >
                        Marcar Confirmada
                      </button>
                    </>
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

      {/* MODAL: GENERAR COTIZACIÓN DESDE AGENDAMIENTO */}
      {showQuoteModal && quoteBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-blue-950">
                    Generar Cotización Comercial
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Origen: Visita a Terreno
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Punto de partida de trazabilidad para <strong>{quoteBooking.clientName}</strong> · Proyecto: <strong>{quoteBooking.project}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quoteFormError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                {quoteFormError}
              </div>
            )}

            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              {/* Sección 1: Datos del Cliente */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                  1. Identificación del Cliente (Pre-cargado del Agendamiento)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre Completo / Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={quoteFormData.clientName}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, clientName: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipo y Documento *
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={quoteFormData.clientDocType}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, clientDocType: e.target.value })
                        }
                        className="w-20 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="NIT">NIT</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Número de cédula"
                        value={quoteFormData.clientDocNumber}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, clientDocNumber: e.target.value })
                        }
                        className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={quoteFormData.clientPhone}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, clientPhone: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={quoteFormData.clientEmail}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, clientEmail: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Dirección y Ciudad *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="Dirección"
                        value={quoteFormData.clientAddress}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, clientAddress: e.target.value })
                        }
                        className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Ciudad"
                        value={quoteFormData.clientCity || "Ibagué"}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, clientCity: e.target.value })
                        }
                        className="w-24 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Proyecto y Lote */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                  2. Inmueble y Valores del Lote
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Proyecto Inmobiliario *
                    </label>
                    <select
                      value={quoteFormData.projectName}
                      onChange={(e) => handleQuoteProjectChange(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-950"
                    >
                      {projectList.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Etapa / Manzana
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Etapa"
                        value={quoteFormData.stage}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, stage: e.target.value })
                        }
                        className="w-1/2 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Manzana"
                        value={quoteFormData.block}
                        onChange={(e) =>
                          setQuoteFormData({ ...quoteFormData, block: e.target.value })
                        }
                        className="w-1/2 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número de Lote *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Lote 14"
                      value={quoteFormData.lotNumber}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, lotNumber: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Área Total (m²) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={quoteFormData.totalArea}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          totalArea: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Valor por m² ($ COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="5000"
                      value={quoteFormData.pricePerSquareMeter}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          pricePerSquareMeter: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between bg-blue-100/60 p-2.5 rounded-lg border border-blue-200">
                    <div>
                      <span className="text-[10px] font-bold text-blue-900 uppercase block">
                        Valor Inmueble (Subtotal)
                      </span>
                      <span className="text-sm font-black text-blue-950">
                        {formatCOP(quoteFormData.totalArea * quoteFormData.pricePerSquareMeter)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-600 uppercase block">
                        Valor Final Cotizado
                      </span>
                      <span className="text-sm font-black text-emerald-800">
                        {formatCOP(
                          Math.max(
                            0,
                            quoteFormData.totalArea * quoteFormData.pricePerSquareMeter -
                              (quoteFormData.hasDiscount ? quoteFormData.discountAmount || 0 : 0)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descuento Opcional */}
                <div className="pt-2 border-t border-slate-200/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quoteFormData.hasDiscount}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          hasDiscount: e.target.checked,
                          discountAmount: e.target.checked ? quoteFormData.discountAmount || 5000000 : 0,
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Aplica Bono o Descuento Comercial
                    </span>
                  </label>

                  {quoteFormData.hasDiscount && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <input
                        type="number"
                        placeholder="Monto Descuento ($ COP)"
                        value={quoteFormData.discountAmount}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            discountAmount: Number(e.target.value),
                          })
                        }
                        className="text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Motivo del descuento (ej. Bono Visita a Terreno)"
                        value={quoteFormData.discountDescription || ""}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            discountDescription: e.target.value,
                          })
                        }
                        className="text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 3: Plan de Pago y Separación */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                  3. Plan de Pagos, Separación y Asignación
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Valor de Separación ($ COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500000"
                      value={quoteFormData.reservationAmount}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          reservationAmount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cuotas Pactadas (Meses)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={quoteFormData.installmentsCount}
                      onChange={(e) =>
                        setQuoteFormData({
                          ...quoteFormData,
                          installmentsCount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Asesor Comercial
                    </label>
                    <select
                      value={quoteFormData.advisorId || ""}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, advisorId: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar Asesor...</option>
                      {advisors.map((adv) => (
                        <option key={adv.id} value={adv.id}>
                          {adv.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Observaciones / Compromisos de la Visita
                    </label>
                    <textarea
                      rows={2}
                      value={quoteFormData.observations || ""}
                      onChange={(e) =>
                        setQuoteFormData({ ...quoteFormData, observations: e.target.value })
                      }
                      placeholder="Condiciones comerciales pactadas, notas de visita, etc."
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending ? "Generando Cotización..." : "Generar Cotización e Iniciar Trazabilidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
