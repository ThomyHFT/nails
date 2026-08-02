export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-md border bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
