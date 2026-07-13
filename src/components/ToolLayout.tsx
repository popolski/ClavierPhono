import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface ToolLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
        ← Retour à l'accueil
      </Link>
      <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 mb-8 text-gray-500">{description}</p>
      {children}
    </div>
  )
}
