"use client";

import { useLocale } from "@/context/locale-context";

export function CompatibilityBar({ score }: { score: number }) {
  const { t } = useLocale();

  return (
    <div>
      <div className="flex items-center justify-between text-[15px] font-medium text-[#9a6e56]">
        <span>{t("shared.compatibility")}</span>
        <span className="text-[2rem] font-semibold leading-none text-success">{score}%</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#efe9df]">
        <div
          className="h-full rounded-full bg-success transition-[width] duration-700 ease-out"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
