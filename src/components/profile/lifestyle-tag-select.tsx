"use client";

export function LifestyleTagSelect<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              selected ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-primary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
