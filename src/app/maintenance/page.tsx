"use client";

import { Wrench } from "lucide-react";

import { useLocale } from "@/context/locale-context";

export default function MaintenancePage() {
  const { t } = useLocale();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-6 w-6" />
        </span>
        <span className="mt-6 inline-flex rounded-full bg-highlight/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {t("maintenance.badge")}
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold text-foreground">{t("maintenance.title")}</h1>
        <p className="mt-3 text-sm leading-7 text-foreground/60">{t("maintenance.description")}</p>
      </div>
    </main>
  );
}
