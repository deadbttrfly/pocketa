interface TransactionItemProps {
  title: string;
  category: string;
  date: string;
  amount: string;
  type: "income" | "expense";
}

export default function TransactionItem({
  title,
  category,
  date,
  amount,
  type,
}: TransactionItemProps) {
  const isIncome = type === "income";

  return (
    <div className="flex items-start justify-between gap-3 py-4 sm:items-center sm:gap-4">
      {/* Transaction Info */}
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        {/* Type Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isIncome ? "bg-success/10" : "bg-danger/10"
          }`}
        >
          <span
            className={`text-lg font-semibold ${
              isIncome ? "text-success" : "text-danger"
            }`}
          >
            {isIncome ? "+" : "−"}
          </span>
        </div>

        {/* Transaction Details */}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>

          <p className="mt-1 truncate text-xs text-muted">
            {category} · {date}
          </p>
        </div>
      </div>

      {/* Amount */}
      <p
        className={`shrink-0 text-right text-xs font-semibold sm:text-sm ${
          isIncome ? "text-success" : "text-danger"
        }`}
      >
        {isIncome ? "+" : "-"}
        {amount}
      </p>
    </div>
  );
}