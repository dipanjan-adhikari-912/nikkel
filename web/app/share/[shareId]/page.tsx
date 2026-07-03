import { notFound } from 'next/navigation'
import { getSharedProject, NotFoundError } from '@/lib/api'
import { Header } from './_components/Header'
import { Hero } from './_components/Hero'
import { ProjectCard } from './_components/ProjectCard'
import { Actions } from './_components/Actions'
import { Footer } from './_components/Footer'

interface Props {
  params: { shareId: string }
}

export default async function SharePage({ params }: Props) {
  let project
  try {
    project = await getSharedProject(params.shareId)
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    return <ErrorState />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 pb-16">
        <Hero />
        <ProjectCard
          name={project.name}
          url={project.url}
          collaboratorCount={project.collaboratorCount}
          pinCount={project.pinCount}
          commentCount={project.commentCount}
        />
        <Actions shareId={params.shareId} url={project.url} />
      </main>
      <Footer />
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface-card text-2xl">
        ⚠️
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Could not load the project. The server may be offline or unreachable.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover"
      >
        Try again
      </a>
    </div>
  )
}
