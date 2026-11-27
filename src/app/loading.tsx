export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium tracking-wide">Loading CareerLaunch...</span>
      </div>
    </div>
  );
}
