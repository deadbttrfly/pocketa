interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}

export default function StatCard({
  label,
  value,
  description,
  valueClassName = "text-foreground",
}: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl shadow-lg bg-card p-5 sm:p-6">
      <p className="text-sm font-medium text-muted">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-xl font-bold sm:text-2xl ${valueClassName}`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-muted">
          {description}
        </p>
      )}
    </div>
  );
}