/** Placeholder shown for the one frame before localStorage has been read. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-sunken" />
        <div className="h-11 w-64 rounded-xl bg-sunken" />
      </div>
      <div className="h-14 rounded-2xl bg-sunken" />
      <div className="space-y-2 rounded-card border border-line bg-surface p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-sunken" />
        ))}
      </div>
    </div>
  );
}
