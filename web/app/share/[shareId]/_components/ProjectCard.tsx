interface ProjectCardProps {
  name: string
  url: string
  collaboratorCount: number
  pinCount: number
  commentCount: number
}

export function ProjectCard({ name, url, collaboratorCount, pinCount, commentCount }: ProjectCardProps) {
  const hostname = url.startsWith('http') ? new URL(url).hostname : url

  return (
    <div className="mx-auto mt-12 w-full max-w-md rounded-xl border border-surface-border bg-surface-card p-6 shadow-lg shadow-black/20 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted-dark">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white">{name}</h2>
          <p className="truncate text-sm text-muted">{hostname}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-surface-border pt-6">
        <Stat label="Collaborators" value={collaboratorCount} />
        <Stat label="Pins" value={pinCount} />
        <Stat label="Comments" value={commentCount} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  )
}
