export interface SharedProject {
  id: string
  name: string
  url: string
  shareToken: string
  collaboratorCount: number
  pinCount: number
  commentCount: number
}

export async function getSharedProject(shareId: string): Promise<SharedProject> {
  const res = await fetch(`/api/projects/share/${encodeURIComponent(shareId)}`, {
    next: { revalidate: 60 },
  })

  if (res.status === 404) {
    throw new Error('Project not found')
  }

  if (!res.ok) {
    throw new Error('Failed to fetch project')
  }

  return res.json()
}
