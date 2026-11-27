import Skeleton from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="space-y-2">
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="1rem" width="60%" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton height="1rem" width="70%" />
            <div className="mt-3 space-y-2">
              <Skeleton height="0.75rem" />
              <Skeleton height="0.75rem" width="85%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
