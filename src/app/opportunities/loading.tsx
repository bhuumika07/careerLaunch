export default function OpportunitiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading Explore Opportunities...</span>
      </div>
      <div className="animate-pulse space-y-8">
        <div className="space-y-3 max-w-3xl">
          <div className="h-5 w-40 bg-slate-200/80 rounded-full" />
          <div className="h-9 w-80 bg-slate-200/90 rounded-xl" />
          <div className="h-4 w-96 bg-slate-200/60 rounded-lg" />
        </div>
        <div className="h-44 w-full bg-slate-100 border border-border rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-52 bg-slate-100 border border-border rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
