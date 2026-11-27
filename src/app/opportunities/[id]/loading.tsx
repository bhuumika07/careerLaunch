export default function OpportunityDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading opportunity details &amp; fit analysis...</span>
      </div>
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200/80 rounded-xl" />
        <div className="h-36 w-full bg-slate-100 border border-border rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 bg-slate-100 border border-border rounded-3xl" />
          <div className="h-72 bg-slate-100 border border-border rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
