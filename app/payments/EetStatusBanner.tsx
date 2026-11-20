"use client";

// Upozornění na tržby, které se nepodařilo odeslat do EET (zobrazí se jen když je co řešit).
import { useEffect, useState } from "react";

type EetStatus = {
  enabled: boolean;
  env?: "playground" | "production";
  pending?: number;
  errors?: number;
  oldestUnsentAt?: string | null;
  lastError?: string | null;
};

export default function EetStatusBanner() {
  const [status, setStatus] = useState<EetStatus | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/eet", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const resend = async () => {
    setSending(true);
    try {
      const r = await fetch("/api/eet", { method: "POST" });
      if (r.ok) setStatus(await r.json());
    } finally {
      setSending(false);
    }
  };

  if (!status?.enabled) return null;
  const unsent = (status.pending ?? 0) + (status.errors ?? 0);
  const isTest = status.env !== "production";

  if (unsent === 0) {
    return isTest ? (
      <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs font-bold text-sky-800">
        EET: testovací režim (playground) – tržby se zatím reálně neevidují.
      </div>
    ) : null;
  }

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-amber-900">
        <p className="font-black">
          ⚠️ {unsent} {unsent === 1 ? "tržba nebyla odeslána" : "tržeb nebylo odesláno"} do EET
          {isTest && " (testovací režim)"}
        </p>
        <p className="text-xs font-semibold text-amber-800">
          Musí se odeslat do 48 hodin.
          {status.oldestUnsentAt &&
            ` Nejstarší: ${new Date(status.oldestUnsentAt).toLocaleString("cs-CZ")}.`}
          {status.lastError && ` Chyba: ${status.lastError}`}
        </p>
      </div>
      <button
        onClick={resend}
        disabled={sending}
        className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {sending ? "Odesílám..." : "Odeslat znovu"}
      </button>
    </div>
  );
}
