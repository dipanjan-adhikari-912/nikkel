import Image from 'next/image'

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[10px] font-bold tracking-tight text-white">
          N
        </div>
        <span className="text-sm font-semibold text-white">Nikkel</span>
      </div>
      <span className="rounded-full border border-surface-border bg-surface-card px-3 py-1 text-[11px] font-medium tracking-wide text-muted">
        Shared Project
      </span>
    </header>
  )
}
