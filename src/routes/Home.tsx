import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-gray-900">ClavierPhono</h1>
      <p className="mt-3 text-gray-500">
        Un clavier phonétique pour aider les élèves à trouver l'orthographe des mots qu'ils veulent écrire.
      </p>
      <Link
        to="/clavier"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-lg font-medium text-white hover:bg-brand-700"
      >
        Commencer
      </Link>
    </div>
  )
}
