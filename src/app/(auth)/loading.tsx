export default function AuthLoading() {
  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium">Loading portal...</span>
    </div>
  );
}
