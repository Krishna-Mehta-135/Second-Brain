export function EditorSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[hsl(var(--sb-bg))]">
      <div className="max-w-3xl mx-auto px-10 py-16 space-y-4 animate-pulse">
        <div className="h-12 bg-[hsl(var(--sb-bg-panel))] rounded-lg w-2/3" />
        <div className="flex gap-2 mb-10">
          <div className="h-6 w-16 bg-[hsl(var(--sb-bg-panel))] rounded border border-[hsl(var(--sb-border))]" />
          <div className="h-6 w-24 bg-[hsl(var(--sb-bg-panel))] rounded border border-[hsl(var(--sb-border))]" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 0.9, 0.95, 0.7, 0.85, 0.6].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-[hsl(var(--sb-bg-panel))] rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
        <div className="space-y-3 pt-6">
          {[0.8, 1, 0.75].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-[hsl(var(--sb-bg-panel))] rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
