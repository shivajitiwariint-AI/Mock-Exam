function ComingSoon({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">{description}</p>
      <span className="mt-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
        Coming Soon
      </span>
    </div>
  )
}

export default function MeditationPage() {
  return <ComingSoon icon="🧘" title="Meditation Tracking" description="Track sessions, build streaks, and write reflections. Coming in Phase 5." />
}
