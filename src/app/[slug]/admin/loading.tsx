export default function AdminLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="h-8 w-48 animate-pulse rounded-full bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-card border border-outline-variant bg-surface-2" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-card border border-outline-variant bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
