export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-card" />
          <div className="h-4 w-16 animate-pulse rounded bg-surface-card" />
        </div>
        <div className="h-5 w-28 animate-pulse rounded-full bg-surface-card" />
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-24">
        <div className="mx-auto h-12 w-72 animate-pulse rounded-lg bg-surface-card sm:h-14 sm:w-96" />
        <div className="mx-auto mt-4 h-5 w-56 animate-pulse rounded bg-surface-card" />
        <div className="mx-auto mt-12 h-52 w-full max-w-md animate-pulse rounded-xl bg-surface-card" />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="h-11 w-48 animate-pulse rounded-lg bg-surface-card" />
          <div className="h-11 w-56 animate-pulse rounded-lg bg-surface-card" />
        </div>
      </main>
    </div>
  )
}
