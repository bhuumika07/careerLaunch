export default function StudentLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading workspace...</span>
      </div>
      <div className="h-10 w-72 bg-slate-200/80 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 border border-border rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-100 border border-border rounded-3xl" />
    </div>
  );
}
