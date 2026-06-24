export function CompatibilityBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground/60">
        <span>Compatibility</span>
        <span>{score}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
