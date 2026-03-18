export default function Home() {
  return (
    <main className="min-h-screen bg-slate-200 p-4 md:p-6">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center space-y-8">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-5xl font-bold tracking-tight">Hospoda systém</h1>
          <p className="mt-3 text-xl text-slate-600">
            Vyber sekci
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <a
            href="/section/vnitrek"
            className="flex min-h-[220px] items-center justify-center rounded-3xl border-2 border-blue-300 bg-blue-100 p-8 text-center text-4xl font-bold shadow-sm transition active:scale-[0.99]"
          >
            Vnitřek
          </a>

          <a
            href="/section/zahradka"
            className="flex min-h-[220px] items-center justify-center rounded-3xl border-2 border-green-300 bg-green-100 p-8 text-center text-4xl font-bold shadow-sm transition active:scale-[0.99]"
          >
            Zahrádka
          </a>

          <a
            href="/section/salonek"
            className="flex min-h-[220px] items-center justify-center rounded-3xl border-2 border-purple-300 bg-purple-100 p-8 text-center text-4xl font-bold shadow-sm transition active:scale-[0.99]"
          >
            Salónek
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/payments"
            className="rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white shadow-sm"
          >
            Historie plateb
          </a>

          <a
            href="/summary"
            className="rounded-2xl bg-green-600 px-5 py-4 text-lg font-semibold text-white shadow-sm"
          >
            Denní souhrn
          </a>

          <a
            href="/products"
            className="rounded-2xl bg-blue-600 px-5 py-4 text-lg font-semibold text-white shadow-sm"
          >
            Správa produktů
          </a>

          <a
            href="/stock"
            className="rounded-2xl bg-amber-600 px-5 py-4 text-lg font-semibold text-white shadow-sm"
          >
            Sklad
          </a>
        </div>
      </div>
    </main>
  );
}