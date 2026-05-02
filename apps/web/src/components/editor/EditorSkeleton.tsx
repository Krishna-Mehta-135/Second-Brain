export function EditorSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-4 animate-pulse">
        <div className="h-9 bg-muted rounded-lg w-2/3" />
        <div className="space-y-3 pt-4">
          {[1, 0.9, 0.95, 0.7, 0.85, 0.6].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
        <div className="space-y-3 pt-6">
          {[0.8, 1, 0.75].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
