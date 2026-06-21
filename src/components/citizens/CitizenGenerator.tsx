export default function CitizenGenerator() {
  return (
    <div className="p-4 text-sm">
      <p className="text-slate-400">
        Citizen generation runs via{' '}
        <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs font-mono">
          npm run precompute
        </code>
        .
      </p>
      <p className="mt-2 text-slate-500">Demo citizens are pre-loaded from JSON.</p>
    </div>
  )
}
