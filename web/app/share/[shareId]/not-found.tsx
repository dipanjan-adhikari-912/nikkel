import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface-card text-2xl">
        🔗
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Share link not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        This link may be invalid or the project was removed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover"
      >
        Go home
      </Link>
    </div>
  )
}
