export function ResearchSkeleton({ label }: { label: string }) {
  return <div role="status" aria-label={label} className="space-y-5">
    <div className="skeleton h-9 w-3/5 max-w-sm" aria-hidden="true" />
    <div className="skeleton h-4 w-4/5 max-w-md" aria-hidden="true" />
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map(item => <div key={item} className="surface space-y-3 p-4">
        <div className="skeleton h-3 w-1/2" /><div className="skeleton h-6 w-2/3" />
      </div>)}
    </div>
  </div>;
}
