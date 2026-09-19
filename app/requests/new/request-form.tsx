"use client";

import { useState } from "react";
import Link from "next/link";
import { createRequest } from "../actions";

interface AreaItem {
  id: string;
  name: string;
  code: string;
}

interface MasterValueItem {
  id: string;
  value: string;
  areaId: string | null;
}

interface Props {
  areas: AreaItem[];
  requestTypes: MasterValueItem[];
  priorities: MasterValueItem[];
  userEmail: string;
  userName: string;
}

export default function NewRequestForm({
  areas,
  requestTypes,
  priorities,
  userName,
}: Props) {
  const [originAreaId, setOriginAreaId] = useState("");
  const [destinationAreaId, setDestinationAreaId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tipos de solicitud filtrados por el área de destino seleccionada
  const availableTypes = requestTypes.filter(
    (t) => t.areaId === destinationAreaId || t.areaId === null
  );

  const selectedDestinationArea = areas.find((a) => a.id === destinationAreaId);

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        if (selectedType === "__other__") {
          formData.set("type", customType);
        }
        await createRequest(formData);
      }}
      className="space-y-6 bg-blue-50/70 p-6 md:p-8 rounded-xl border border-blue-200 shadow-sm"
    >
      <div className="border-b border-blue-200 pb-4">
        <h2 className="text-xl font-bold text-blue-950">
          Radicación Transversal de Solicitud
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Radicado por: <span className="font-bold text-blue-900">{userName}</span>. Toda solicitud se dirige directamente al área de destino para su asignación inmediata.
        </p>
      </div>

      {/* Selector de Áreas: Origen y Destino */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Área de Origen (Requerido)
          </label>
          <select
            name="originAreaId"
            value={originAreaId}
            onChange={(e) => setOriginAreaId(e.target.value)}
            required
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Seleccione el área que origina la solicitud --</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Área desde la cual se formula el requerimiento.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Área de Destino (Requerido)
          </label>
          <select
            name="destinationAreaId"
            value={destinationAreaId}
            onChange={(e) => {
              setDestinationAreaId(e.target.value);
              setSelectedType("");
            }}
            required
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Seleccione el área responsable de atenderla --</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Área que recibirá la solicitud y gestionará su ejecución.
          </span>
        </div>
      </div>

      {/* Tipo de Solicitud y Prioridad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Tipo de Solicitud (Requerido)
          </label>
          <select
            name="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={!destinationAreaId}
            required
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {!destinationAreaId
                ? "-- Primero seleccione un área de destino --"
                : availableTypes.length > 0
                ? "-- Seleccione el tipo de solicitud --"
                : "-- Sin tipos específicos predefinidos --"}
            </option>
            {availableTypes.map((t) => (
              <option key={t.id} value={t.value}>
                {t.value}
              </option>
            ))}
            {destinationAreaId && (
              <option value="__other__">Otro tipo (especificar)...</option>
            )}
          </select>
          {selectedType === "__other__" && (
            <input
              type="text"
              placeholder="Escriba el tipo de solicitud específico"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          )}
          <span className="text-[11px] text-slate-500 mt-1 block">
            {selectedDestinationArea
              ? `Opciones parametrizadas para ${selectedDestinationArea.name}.`
              : "Seleccione el área de destino para ver sus opciones."}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Prioridad
          </label>
          <select
            name="priority"
            defaultValue="Media"
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {priorities.length > 0 ? (
              priorities.map((p) => (
                <option key={p.id} value={p.value}>
                  {p.value}
                </option>
              ))
            ) : (
              <>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </>
            )}
          </select>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Nivel de urgencia funcional para la atención.
          </span>
        </div>
      </div>

      {/* Título de la solicitud */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Título de la Solicitud (Requerido)
        </label>
        <input
          type="text"
          name="title"
          required
          placeholder="Ejemplo: Diseño de piezas para Campaña Lanzamiento Q4"
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Descripción y detalle */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Descripción y Requerimiento Detallado (Requerido)
        </label>
        <textarea
          name="description"
          rows={4}
          required
          placeholder="Describa claramente el objetivo, requerimiento, especificaciones o insumos disponibles..."
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Enlace a Repositorio o Almacenamiento Externo */}
      <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
        <div>
          <span className="text-xs font-bold text-blue-950 block">
            Repositorio o Enlace Externo (Opcional)
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Puede incluir la dirección de una carpeta de Google Drive, OneDrive, Figma o un repositorio de código o archivos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Dirección web (URL) del enlace o repositorio
            </label>
            <input
              type="url"
              name="externalUrl"
              placeholder="https://drive.google.com/... o https://github.com/..."
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nombre o etiqueta del enlace
            </label>
            <input
              type="text"
              name="externalUrlName"
              placeholder="Ejemplo: Carpeta de insumos y recursos en Drive"
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Fecha requerida de entrega */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Fecha Requerida de Entrega (Opcional)
          </label>
          <input
            type="date"
            name="dueDate"
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-200">
        <Link
          href="/requests"
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Radicando solicitud..." : "Radicar Solicitud"}
        </button>
      </div>
    </form>
  );
}
