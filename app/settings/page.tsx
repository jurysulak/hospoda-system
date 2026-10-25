"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [currentPin, setCurrentPin] = useState("1234");
  const [newPin, setNewPin] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("gastro_summary_pin");
    if (saved) setCurrentPin(saved);
  }, []);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setMessage("❌ PIN musí mít přesně 4 číslice!");
      return;
    }
    localStorage.setItem("gastro_summary_pin", newPin);
    setCurrentPin(newPin);
    setNewPin("");
    setMessage("✅ PIN byl úspěšně změněn.");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            ← Zpět
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nastavení systému
          </h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            🔒 Zabezpečení denního souhrnu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Zde si nastavíš 4místný číselný kód, kterým se odemykají denní tržby.
          </p>

          <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
            Aktuální PIN: <span className="font-black text-slate-900 text-sm tracking-widest">{currentPin}</span>
          </div>

          <form onSubmit={handleSavePin} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nový 4místný PIN
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="např. 2580"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center text-lg font-black tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 py-3 text-sm font-bold text-white shadow-xs transition cursor-pointer"
            >
              Uložit nový PIN
            </button>
          </form>

          {message && (
            <p className="mt-3 text-center text-xs font-bold text-slate-700">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}