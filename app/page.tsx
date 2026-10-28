export default function Home() {
  return (
    <main className="min-h-screen bg-slate-200 p-4 md:p-6 select-none">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl flex-col justify-center space-y-8">
        {/* Hlavička */}
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-5xl font-bold tracking-tight">Hospoda systém</h1>
          <p className="mt-3 text-xl text-slate-600">Vyber sekci nebo stůl</p>
        </div>

        {/* Hlavní sekce místností + samostatný BAR */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/tables/1"
            className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-amber-400 bg-amber-100 p-6 text-center shadow-sm transition active:scale-[0.99] hover:bg-amber-200/70"
          >
            <span className="text-4xl mb-2">🍺</span>
            <span className="text-3xl font-bold text-amber-950">BAR</span>
            <span className="text-xs font-semibold text-amber-800 mt-1">Rychlý prodej</span>
          </a>

          <a
            href="/section/vnitrek"
            className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-blue-300 bg-blue-100 p-6 text-center shadow-sm transition active:scale-[0.99] hover:bg-blue-200/70"
          >
            <span className="text-4xl mb-2">🏠</span>
            <span className="text-3xl font-bold text-blue-950">Vnitřek</span>
          </a>

          <a
            href="/section/zahradka"
            className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-green-300 bg-green-100 p-6 text-center shadow-sm transition active:scale-[0.99] hover:bg-green-200/70"
          >
            <span className="text-4xl mb-2">🌳</span>
            <span className="text-3xl font-bold text-green-950">Zahrádka</span>
          </a>

          <a
            href="/section/salonek"
            className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-purple-300 bg-purple-100 p-6 text-center shadow-sm transition active:scale-[0.99] hover:bg-purple-200/70"
          >
            <span className="text-4xl mb-2">🛋️</span>
            <span className="text-3xl font-bold text-purple-950">Salónek</span>
          </a>
        </div>

        {/* Spodní panel rychlých odkazů */}
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/kitchen"
            className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-95"
          >
            👨‍🍳 Kuchyně (KDS)
          </a>

          <a
            href="/payments"
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-95"
          >
            Historie plateb
          </a>

          <a
            href="/summary"
            className="rounded-2xl bg-green-600 hover:bg-green-700 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-95"
          >
            Denní souhrn
          </a>

          <a
            href="/products"
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-95"
          >
            Správa produktů
          </a>

          <a
            href="/stock"
            className="rounded-2xl bg-amber-700 hover:bg-amber-800 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-95"
          >
            Sklad
          </a>
        </div>
      </div>
    </main>
  );
}