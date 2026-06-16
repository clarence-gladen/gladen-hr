export function PageLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 flex h-[52px] items-center bg-brand px-4" />

      {/* Content skeleton */}
      <div className="flex-1 animate-pulse px-4 py-6 space-y-3">
        <div className="h-24 rounded-xl bg-black/5" />
        <div className="h-20 rounded-xl bg-black/5" />
        <div className="h-20 rounded-xl bg-black/5" />
        <div className="h-20 rounded-xl bg-black/5" />
      </div>
    </div>
  );
}
