"use client";

import { useState } from "react";
import {
  createMarketingContent,
  updateMarketingContent,
  updateMarketingContentStatus,
  deleteMarketingContent,
} from "./actions";

export interface MarketingContentItem {
  id: string;
  brand: string;
  date: Date;
  title: string;
  format: string;
  objective: string;
  platforms: string;
  copy: string | null;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  requestId: string | null;
  request: { id: string; ticketNumber: string; title: string } | null;
}

interface Props {
  initialContents: MarketingContentItem[];
  marketingOperators: Array<{ id: string; name: string; email: string }>;
  coreRequests: Array<{ id: string; ticketNumber: string; title: string }>;
  canEdit: boolean;
}

const BRANDS = ["Monte Azul", "Monte Azul Inmobiliaria", "Proyectos Monte Azul"];

const FORMATS = [
  "Carrusel",
  "Reel / Video Corto",
  "Post Estático",
  "Historia",
  "Video Formato Largo",
  "Infografía",
  "Comunicado / Nota",
];

const OBJECTIVES = [
  "Alcance y Reconocimiento",
  "Engagement y Comunidad",
  "Conversión y Leads",
  "Fidelización",
  "Tráfico Web",
  "Branding Corporativo",
];

const ALL_PLATFORMS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "WhatsApp",
];

const STATUSES = [
  "Borrador",
  "En Producción",
  "En Aprobación",
  "Aprobado",
  "Publicado",
  "Cancelado",
];

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

function getStatusStyle(status: string) {
  switch (status) {
    case "Borrador":
      return "bg-slate-100 text-slate-800 border-slate-300";
    case "En Producción":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "En Aprobación":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "Aprobado":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "Publicado":
      return "bg-blue-700 text-white border-blue-700 shadow-2xs";
    case "Cancelado":
      return "bg-rose-100 text-rose-800 border-rose-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export default function CalendarView({
  initialContents,
  marketingOperators,
  coreRequests,
  canEdit,
}: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  // Filtros
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketingContentItem | null>(null);
  const [detailItem, setDetailItem] = useState<MarketingContentItem | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Formulario modal
  const [formBrand, setFormBrand] = useState("Monte Azul");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formTitle, setFormTitle] = useState("");
  const [formFormat, setFormFormat] = useState("Carrusel");
  const [formObjective, setFormObjective] = useState("Alcance y Reconocimiento");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(["Instagram", "Facebook"]);
  const [formCopy, setFormCopy] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formThumbnailUrl, setFormThumbnailUrl] = useState("");
  const [formStatus, setFormStatus] = useState("Borrador");
  const [formNotes, setFormNotes] = useState("");
  const [formAssignedToId, setFormAssignedToId] = useState("");
  const [formRequestId, setFormRequestId] = useState("");

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  const openCreateModal = (defaultDate?: string) => {
    let initialDate = defaultDate || todayStr;
    if (initialDate < todayStr) {
      initialDate = todayStr;
    }
    setEditingItem(null);
    setFormBrand("Monte Azul");
    setFormDate(initialDate);
    setFormTime("09:00");
    setFormTitle("");
    setFormFormat("Carrusel");
    setFormObjective("Alcance y Reconocimiento");
    setFormPlatforms(["Instagram", "Facebook"]);
    setFormCopy("");
    setFormFileUrl("");
    setFormThumbnailUrl("");
    setFormStatus("Borrador");
    setFormNotes("");
    setFormAssignedToId(marketingOperators[0]?.id || "");
    setFormRequestId("");
    setModalOpen(true);
  };

  const openEditModal = (item: MarketingContentItem) => {
    setEditingItem(item);
    setDetailItem(null);
    const d = new Date(item.date);
    const dateStr = d.toISOString().slice(0, 10);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    setFormBrand(item.brand);
    setFormDate(dateStr);
    setFormTime(`${hours}:${minutes}`);
    setFormTitle(item.title);
    setFormFormat(item.format);
    setFormObjective(item.objective);
    setFormPlatforms(item.platforms.split(",").map((p) => p.trim()));
    setFormCopy(item.copy || "");
    setFormFileUrl(item.fileUrl || "");
    setFormThumbnailUrl(item.thumbnailUrl || "");
    setFormStatus(item.status);
    setFormNotes(item.notes || "");
    setFormAssignedToId(item.assignedToId || "");
    setFormRequestId(item.requestId || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || formPlatforms.length === 0) {
      alert("Por favor complete el tema, la fecha programada y al menos una plataforma.");
      return;
    }

    const scheduledDateTime = new Date(`${formDate}T${formTime || "00:00"}:00`);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!editingItem && scheduledDateTime < fiveMinutesAgo) {
      alert("Inconsistencia de fecha: No se permite programar publicaciones o contenidos con fechas u horas en el pasado.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    if (editingItem) fd.set("id", editingItem.id);
    fd.set("brand", formBrand);
    fd.set("date", formDate);
    fd.set("time", formTime);
    fd.set("title", formTitle);
    fd.set("format", formFormat);
    fd.set("objective", formObjective);
    fd.set("platforms", formPlatforms.join(", "));
    if (formCopy) fd.set("copy", formCopy);
    if (formFileUrl) fd.set("fileUrl", formFileUrl);
    if (formThumbnailUrl) fd.set("thumbnailUrl", formThumbnailUrl);
    fd.set("status", formStatus);
    if (formNotes) fd.set("notes", formNotes);
    if (formAssignedToId) fd.set("assignedToId", formAssignedToId);
    if (formRequestId) fd.set("requestId", formRequestId);

    try {
      if (editingItem) {
        await updateMarketingContent(fd);
      } else {
        await createMarketingContent(fd);
      }
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el contenido.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleQuickStatusChange = async (contentId: string, newStatus: string) => {
    setIsPending(true);
    try {
      await updateMarketingContentStatus(contentId, newStatus);
      if (detailItem && detailItem.id === contentId) {
        setDetailItem({ ...detailItem, status: newStatus });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar estado.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("¿Está seguro de eliminar este contenido del calendario?")) return;
    setIsPending(true);
    try {
      await deleteMarketingContent(contentId);
      setDetailItem(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar contenido.";
      alert(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredContents.length === 0) {
      alert("No hay publicaciones en la vista y filtros actuales para exportar.");
      return;
    }

    const headers = [
      "Fecha",
      "Hora",
      "Marca",
      "Tema / Título",
      "Formato",
      "Objetivo",
      "Plataformas",
      "Estado",
      "Responsable",
      "Copy",
      "Enlace Archivos/Drive",
      "Solicitud Core Asociada",
      "Notas Internas",
    ];

    const escapeCSV = (val: string | null | undefined) => {
      if (!val) return '""';
      return `"${val.replace(/"/g, '""')}"`;
    };

    const rows = filteredContents.map((c) => {
      const d = new Date(c.date);
      const dateStr = d.toISOString().slice(0, 10);
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

      return [
        escapeCSV(dateStr),
        escapeCSV(timeStr),
        escapeCSV(c.brand),
        escapeCSV(c.title),
        escapeCSV(c.format),
        escapeCSV(c.objective),
        escapeCSV(c.platforms),
        escapeCSV(c.status),
        escapeCSV(c.assignedTo?.name || "Sin asignar"),
        escapeCSV(c.copy),
        escapeCSV(c.fileUrl),
        escapeCSV(c.request ? `${c.request.ticketNumber} - ${c.request.title}` : ""),
        escapeCSV(c.notes),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `parrilla_marketing_monteazul_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de contenidos
  const filteredContents = initialContents.filter((item) => {
    if (selectedBrand !== "all" && item.brand !== selectedBrand) return false;
    if (selectedFormat !== "all" && item.format !== selectedFormat) return false;
    if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
    if (
      selectedPlatform !== "all" &&
      !item.platforms.toLowerCase().includes(selectedPlatform.toLowerCase())
    )
      return false;
    return true;
  });

  // Navegación en el calendario
  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Generación de días para Vista Mensual
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // 0 = Domingo, convertimos a 0 = Lunes, 6 = Domingo
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

  // Días previos del mes anterior para completar la primera semana
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(currentYear, currentMonth - 1, dayNum);
    calendarDays.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: false,
    });
  }

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    calendarDays.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: true,
    });
  }

  // Días siguientes del próximo mes para completar cuadrícula de 35 o 42 celdas
  const remainingCells = 42 - calendarDays.length;
  for (let day = 1; day <= (remainingCells >= 7 ? remainingCells - 7 : remainingCells); day++) {
    const d = new Date(currentYear, currentMonth + 1, day);
    calendarDays.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: false,
    });
  }

  // Generación de días para Vista Semanal
  const currentDayOfWeek = (currentDate.getDay() + 6) % 7;
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDayOfWeek);

  const weekDays: Array<{ date: Date; dateStr: string; dayName: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      dayName: DAY_NAMES[i],
    });
  }

  // Título del período activo
  let periodTitle = "";
  if (viewMode === "month") {
    periodTitle = `${MONTH_NAMES[currentMonth]} de ${currentYear}`;
  } else if (viewMode === "week") {
    const endWeek = new Date(weekStart);
    endWeek.setDate(weekStart.getDate() + 6);
    periodTitle = `Semana del ${weekStart.getDate()} de ${MONTH_NAMES[weekStart.getMonth()]} al ${endWeek.getDate()} de ${MONTH_NAMES[endWeek.getMonth()]} de ${endWeek.getFullYear()}`;
  } else {
    periodTitle = `${DAY_NAMES[(currentDate.getDay() + 6) % 7]}, ${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
  }

  return (
    <div className="space-y-6">
      {/* Barra de Control de Navegación, Vistas y Filtros */}
      <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200/70 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-blue-300 bg-white p-0.5 shadow-2xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === "month"
                    ? "bg-blue-700 text-white"
                    : "text-blue-950 hover:bg-blue-50"
                }`}
              >
                Vista Mensual
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === "week"
                    ? "bg-blue-700 text-white"
                    : "text-blue-950 hover:bg-blue-50"
                }`}
              >
                Vista Semanal
              </button>
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === "day"
                    ? "bg-blue-700 text-white"
                    : "text-blue-950 hover:bg-blue-50"
                }`}
              >
                Vista Diaria / Lista
              </button>
            </div>

            <span className="text-sm font-bold text-blue-950 hidden sm:inline-block">
              {periodTitle}
            </span>
          </div>

          {/* Botones de acción principal */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 text-xs font-semibold shadow-2xs transition-colors"
            >
              Exportar Parrilla CSV
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                + Programar Contenido
              </button>
            )}
          </div>
        </div>

        {/* Barra de Navegación Temporal y Filtros Segmentados */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Navegador < Hoy > */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPeriod}
              className="px-2.5 py-1 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-bold"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={setToday}
              className="px-3 py-1 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-semibold"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={nextPeriod}
              className="px-2.5 py-1 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 font-bold"
            >
              Siguiente →
            </button>
            <span className="text-xs font-bold text-blue-950 sm:hidden block ml-2">
              {periodTitle}
            </span>
          </div>

          {/* Filtros Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Marca */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las marcas</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Plataforma */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las plataformas</option>
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Formato */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los formatos</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================
          VISTA 1: MENSUAL
          ============================================================ */}
      {viewMode === "month" && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 bg-blue-100/70 border-b border-blue-200 text-center text-xs font-bold text-blue-950 py-2">
            {DAY_NAMES.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>

          {/* Cuadrícula del mes */}
          <div className="grid grid-cols-7 divide-x divide-y divide-blue-100 min-h-[600px]">
            {calendarDays.map((dayItem) => {
              const dayContents = filteredContents.filter((c) => {
                const cDate = new Date(c.date).toISOString().slice(0, 10);
                return cDate === dayItem.dateStr;
              });

              const isToday =
                new Date().toISOString().slice(0, 10) === dayItem.dateStr;

              return (
                <div
                  key={dayItem.dateStr}
                  className={`min-h-[120px] p-1.5 flex flex-col justify-between transition-colors ${
                    dayItem.isCurrentMonth ? "bg-white" : "bg-slate-50/60"
                  } ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isToday
                          ? "bg-blue-700 text-white"
                          : dayItem.isCurrentMonth
                          ? "text-blue-950"
                          : "text-slate-400"
                      }`}
                    >
                      {dayItem.date.getDate()}
                    </span>

                    {canEdit && dayItem.isCurrentMonth && dayItem.dateStr >= todayStr && (
                      <button
                        type="button"
                        onClick={() => openCreateModal(dayItem.dateStr)}
                        title="Programar contenido en esta fecha"
                        className="text-[11px] font-bold text-slate-400 hover:text-blue-700 hover:bg-blue-50 px-1 rounded transition-colors"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Tarjetas de contenidos del día */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[100px]">
                    {dayContents.map((content) => {
                      const timeStr = new Date(content.date).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={content.id}
                          onClick={() => setDetailItem(content)}
                          className="p-1 rounded bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-[11px] cursor-pointer transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1 leading-tight">
                            <span className="font-mono text-[10px] text-blue-900 font-bold">
                              {timeStr}
                            </span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold border ${getStatusStyle(
                                content.status
                              )}`}
                            >
                              {content.status}
                            </span>
                          </div>
                          <span className="font-bold text-blue-950 block truncate mt-0.5">
                            {content.title}
                          </span>
                          <span className="text-[10px] text-slate-600 block truncate">
                            {content.format} • {content.platforms}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          VISTA 2: SEMANAL
          ============================================================ */}
      {viewMode === "week" && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[900px] divide-x divide-blue-200">
            {weekDays.map((wDay) => {
              const dayContents = filteredContents.filter((c) => {
                const cDate = new Date(c.date).toISOString().slice(0, 10);
                return cDate === wDay.dateStr;
              });

              const isToday =
                new Date().toISOString().slice(0, 10) === wDay.dateStr;

              return (
                <div key={wDay.dateStr} className="flex flex-col min-h-[500px]">
                  {/* Encabezado de la columna semanal */}
                  <div
                    className={`p-2.5 text-center border-b border-blue-200 ${
                      isToday ? "bg-blue-700 text-white" : "bg-blue-100/70 text-blue-950"
                    }`}
                  >
                    <span className="text-xs font-bold block">{wDay.dayName}</span>
                    <span className="text-sm font-bold font-mono">
                      {wDay.date.getDate()} {MONTH_NAMES[wDay.date.getMonth()].slice(0, 3)}
                    </span>
                  </div>

                  {/* Contenidos del día */}
                  <div className="p-2 space-y-2 flex-1 bg-white">
                    {canEdit && wDay.dateStr >= todayStr && (
                      <button
                        type="button"
                        onClick={() => openCreateModal(wDay.dateStr)}
                        className="w-full py-1 text-center text-xs font-semibold text-blue-700 border border-dashed border-blue-300 rounded hover:bg-blue-50 transition-colors"
                      >
                        + Agregar
                      </button>
                    )}

                    {dayContents.length === 0 ? (
                      <div className="text-[11px] text-slate-400 text-center py-6 italic">
                        Sin publicaciones
                      </div>
                    ) : (
                      dayContents.map((content) => {
                        const timeStr = new Date(content.date).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={content.id}
                            onClick={() => setDetailItem(content)}
                            className="p-2.5 rounded-lg bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-xs cursor-pointer transition-colors space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-blue-900">
                                {timeStr}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getStatusStyle(
                                  content.status
                                )}`}
                              >
                                {content.status}
                              </span>
                            </div>

                            <span className="font-bold text-blue-950 block leading-tight">
                              {content.title}
                            </span>

                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              <div>
                                <span className="font-semibold text-slate-700">Marca:</span> {content.brand}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Formato:</span> {content.format}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Canales:</span> {content.platforms}
                              </div>
                            </div>

                            {content.copy && (
                              <p className="text-[11px] text-slate-700 line-clamp-2 bg-white p-1 rounded border border-blue-100 italic">
                                &quot;{content.copy}&quot;
                              </p>
                            )}

                            {content.assignedTo && (
                              <div className="text-[10px] text-blue-900 font-medium pt-1 border-t border-blue-200/60">
                                Resp: {content.assignedTo.name}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          VISTA 3: DIARIA / LISTA DE PUBLICACIONES
          ============================================================ */}
      {viewMode === "day" && (
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-200/70 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                Listado Detallado de Publicaciones ({filteredContents.length} contenidos)
              </span>
              <p className="text-xs text-slate-600">
                Detalle editorial de copies, enlaces a archivos, objetivos y solicitudes asociadas.
              </p>
            </div>
          </div>

          {filteredContents.length === 0 ? (
            <div className="p-8 bg-white rounded-lg border border-blue-200 text-center text-xs text-slate-600">
              No hay publicaciones registradas con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-blue-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100/70 text-blue-950 font-bold border-b border-blue-200">
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Marca / Tema</th>
                    <th className="p-3">Formato / Plataformas</th>
                    <th className="p-3">Objetivo</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Archivos / Core</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-slate-800">
                  {filteredContents.map((item) => {
                    const d = new Date(item.date);
                    const dateFormatted = d.toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3 font-mono font-semibold text-blue-950 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="p-3 max-w-xs">
                          <span className="text-[11px] font-bold text-blue-800 uppercase block">
                            {item.brand}
                          </span>
                          <span className="font-bold text-blue-950 block truncate">
                            {item.title}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">
                            {item.format}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.platforms}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] max-w-[160px] truncate text-slate-700">
                          {item.objective}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusStyle(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-900 font-medium">
                          {item.assignedTo?.name || "Sin asignar"}
                        </td>
                        <td className="p-3 text-[11px] whitespace-nowrap">
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-900 font-bold block"
                            >
                              Ver Archivos ↗
                            </a>
                          )}
                          {item.request && (
                            <span className="text-slate-500 font-mono text-[10px] block">
                              Ticket: {item.request.ticketNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] shadow-2xs transition-colors"
                          >
                            Detalle
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
      )}

      {/* ============================================================
          MODAL DE DETALLE Y GESTIÓN RÁPIDA DE CONTENIDO
          ============================================================ */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-blue-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                    {detailItem.brand}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getStatusStyle(
                      detailItem.status
                    )}`}
                  >
                    {detailItem.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-blue-950 pt-1">
                  {detailItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Metadatos */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div>
                <span className="text-slate-500 block">Fecha y Hora</span>
                <span className="font-bold text-blue-950">
                  {new Date(detailItem.date).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Formato</span>
                <span className="font-bold text-blue-950">{detailItem.format}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Objetivo</span>
                <span className="font-bold text-blue-950">{detailItem.objective}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Plataformas</span>
                <span className="font-bold text-blue-950">{detailItem.platforms}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Responsable</span>
                <span className="font-bold text-blue-950">
                  {detailItem.assignedTo?.name || "Sin asignar"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Creado por</span>
                <span className="font-bold text-blue-950">
                  {detailItem.createdBy.name}
                </span>
              </div>
            </div>

            {/* Copy / Caption */}
            {detailItem.copy && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-blue-950 uppercase tracking-wider text-[11px] block">
                  Copywriting / Texto de Publicación
                </span>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {detailItem.copy}
                </p>
              </div>
            )}

            {/* Enlaces y Archivos */}
            {(detailItem.fileUrl || detailItem.request) && (
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                {detailItem.fileUrl && (
                  <div className="flex items-center justify-between bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-blue-950 font-semibold truncate max-w-[280px]">
                      Archivos de Producción / Repositorio
                    </span>
                    <a
                      href={detailItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-[11px]"
                    >
                      Abrir Enlace ↗
                    </a>
                  </div>
                )}
                {detailItem.request && (
                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-slate-600 block text-[10px]">Solicitud Core Asociada</span>
                    <span className="font-bold text-blue-950 text-xs">
                      {detailItem.request.ticketNumber} — {detailItem.request.title}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notas Internas */}
            {detailItem.notes && (
              <div className="text-xs text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-950 block">Notas de Producción:</span>
                {detailItem.notes}
              </div>
            )}

            {/* Transición rápida de Estado Editorial */}
            {canEdit && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-blue-950 block">
                  Cambiar Estado Editorial:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={isPending || detailItem.status === st}
                      onClick={() => handleQuickStatusChange(detailItem.id, st)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                        detailItem.status === st
                          ? "bg-blue-700 text-white border-blue-700"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      } disabled:opacity-50`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones del pie */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {canEdit ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(detailItem.id)}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                >
                  Eliminar Contenido
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEditModal(detailItem)}
                    className="px-3.5 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-950 text-xs font-semibold shadow-2xs"
                  >
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL DE CREACIÓN / EDICIÓN DE CONTENIDO
          ============================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 border border-blue-200 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h3 className="text-base font-bold text-blue-950">
                {editingItem ? "Editar Publicación Programada" : "Programar Nuevo Contenido de Marketing"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Marca */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Marca *
                  </label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha Programada *
                  </label>
                  <input
                    type="date"
                    required
                    min={editingItem ? undefined : todayStr}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Hora */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Estimada
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tema / Título */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tema / Título del Contenido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lanzamiento nueva etapa de lotes residenciales"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Formato */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Formato *
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Objetivo */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Objetivo *
                  </label>
                  <select
                    value={formObjective}
                    onChange={(e) => setFormObjective(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {OBJECTIVES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plataformas (Checkboxes) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Plataformas de Difusión *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((plat) => {
                    const isSelected = formPlatforms.includes(plat);
                    return (
                      <button
                        type="button"
                        key={plat}
                        onClick={() => {
                          if (isSelected) {
                            setFormPlatforms(formPlatforms.filter((p) => p !== plat));
                          } else {
                            setFormPlatforms([...formPlatforms, plat]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          isSelected
                            ? "bg-blue-700 text-white border-blue-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copywriting / Caption */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Copywriting / Texto del Post
                </label>
                <textarea
                  rows={3}
                  placeholder="Redacte aquí el texto para el post o pie de foto..."
                  value={formCopy}
                  onChange={(e) => setFormCopy(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Enlace a Archivo y Miniatura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enlace Archivos (Google Drive / OneDrive)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enlace Miniatura / Preview (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formThumbnailUrl}
                    onChange={(e) => setFormThumbnailUrl(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Responsable, Estado y Solicitud Core */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estado Editorial *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsable Asignado
                  </label>
                  <select
                    value={formAssignedToId}
                    onChange={(e) => setFormAssignedToId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {marketingOperators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Solicitud Core Vinculada
                  </label>
                  <select
                    value={formRequestId}
                    onChange={(e) => setFormRequestId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ninguna</option>
                    {coreRequests.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.ticketNumber} - {req.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas Internas de Producción
                </label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para diseño, pauta o aprobación..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : editingItem ? "Actualizar Contenido" : "Programar en Calendario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
