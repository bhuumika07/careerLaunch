export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading admin console...</span>
      </div>
      <div className="h-9 w-64 bg-slate-200/80 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-slate-100 border border-border rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-slate-100 border border-border rounded-2xl" />
    </div>
  );
}
