export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-black text-white">404</h1>
      <p className="mt-2 text-sm text-slate-400">Stránka nebyla nalezena</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition"
      >
        Zpět na přehled
      </Link>
    </main>
  );
}