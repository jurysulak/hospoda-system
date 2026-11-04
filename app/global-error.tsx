"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-black text-white">Něco se pokazilo!</h2>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition cursor-pointer"
        >
          Zkusit znovu
        </button>
      </body>
    </html>
  );
}