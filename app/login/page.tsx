"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      router.push("/requests");
      router.refresh();
    }
  }

  const fillDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo1234!");
    setError("");
  };

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5 bg-blue-50/70 p-7 rounded-2xl border border-blue-200 shadow-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl border border-blue-200 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/logo-monteazul.jpg"
              alt="Monteazul Group"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-950">
              Monte Azul Suite
            </h1>
            <p className="text-xs text-slate-600">
              Plataforma Corporativa de Solicitudes y Operaciones
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 bg-white p-4 rounded-xl border border-blue-200">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@monteazul.com"
              required
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Acceso Rápido Demo por Áreas y Roles */}
        <div className="pt-3 border-t border-blue-200 space-y-3">
          <span className="text-xs font-bold text-blue-950 block uppercase tracking-wider text-center">
            Perfiles de prueba para cambio de área y rol:
          </span>

          {/* Gerencia / Admin General */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Gerencia y Control Transversal
            </span>
            <button
              type="button"
              onClick={() => fillDemoUser("admin@monteazul.com")}
              className="w-full p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-950 text-xs">Admin General (Gerencia)</span>
                <span className="text-[11px] text-blue-800 font-semibold">Ve todas las áreas</span>
              </div>
            </button>
          </div>

          {/* Área Marketing */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Área de Marketing
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoUser("directora.marketing@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Directora Marketing</span>
                <span className="text-[10px] text-slate-500 block truncate">Asigna requerimientos MKT</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoUser("operador.marketing@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Operador Marketing</span>
                <span className="text-[10px] text-slate-500 block truncate">Ejecuta tareas MKT</span>
              </button>
            </div>
          </div>

          {/* Área Comercial */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Área Comercial
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoUser("director.comercial@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Director Comercial</span>
                <span className="text-[10px] text-slate-500 block truncate">Asigna requerimientos COM</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoUser("operador.comercial@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Operador Comercial</span>
                <span className="text-[10px] text-slate-500 block truncate">Ejecuta tareas COM</span>
              </button>
            </div>
          </div>

          {/* Área Administración */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Área de Administración
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoUser("director.administracion@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Director Administración</span>
                <span className="text-[10px] text-slate-500 block truncate">Asigna requerimientos ADM</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoUser("operador.administracion@monteazul.com")}
                className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold text-blue-950 block truncate">Operador Administración</span>
                <span className="text-[10px] text-slate-500 block truncate">Ejecuta tareas ADM</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-1">
            <span className="text-[10px] text-slate-600 font-medium">
              Contraseña estándar para todos: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-950 font-bold">Demo1234!</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
