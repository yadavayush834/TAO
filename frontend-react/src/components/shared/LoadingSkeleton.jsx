export function LoadingSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-bg-tertiary animate-pulse"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <span className="text-4xl opacity-30">{icon}</span>
      <p className="text-sm text-text-secondary">{title}</p>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  );
}
