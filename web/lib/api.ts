export interface SharedProject {
  id: string
  name: string
  url: string
  shareToken: string
  collaboratorCount: number
  pinCount: number
  commentCount: number
}

const RAW = process.env.NEXT_PUBLIC_API_URL
if (!RAW || /localhost|127\.0\.0\.1/.test(RAW)) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not configured for production.\n' +
    'Create web/.env.local and set NEXT_PUBLIC_API_URL to your API server URL.'
  )
}
const API_BASE = RAW.replace(/\/+$/, '')

export async function getSharedProject(shareId: string): Promise<SharedProject> {
  const res = await fetch(`${API_BASE}/projects/share/${encodeURIComponent(shareId)}`, {
    next: { revalidate: 60 },
  })

  if (res.status === 404) {
    throw new NotFoundError('Project not found')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch project')
  }

  return res.json()
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
