import { Panel, Section } from "@/components/brand";

export default function PublicLoading() {
  return (
    <Section className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded-full bg-surface-2" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Panel key={index} level={1} className="flex flex-col gap-3">
            <div className="h-32 w-full animate-pulse rounded-card bg-surface-2" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-surface-2" />
          </Panel>
        ))}
      </div>
    </Section>
  );
}
