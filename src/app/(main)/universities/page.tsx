"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocale } from "@/context/locale-context";
import { getActiveUniversities, type PublicUniversity } from "@/lib/data/universities";

export default function UniversitiesPage() {
  const { t } = useLocale();
  const [universities, setUniversities] = useState<PublicUniversity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getActiveUniversities().then((data) => {
      setUniversities(data);
      setLoading(false);
    });
  }, []);

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("universities.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/65 sm:text-base">{t("universities.description")}</p>

      {loading ? (
        <div className="mt-10 grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {universities.map((university) => (
            <article key={university.id} className="rounded-2xl bg-white p-4 shadow-soft sm:p-6">
              <h2 className="font-heading text-xl font-bold">{university.name}</h2>
              <p className="mt-2 text-sm text-foreground/60">
                {university.description || t("universities.cardDescription")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/rooms?university=${encodeURIComponent(university.name)}`} className="font-semibold text-primary">
                  {t("universities.rooms")}
                </Link>
                <Link href={`/roommates?university=${encodeURIComponent(university.name)}`} className="font-semibold text-primary">
                  {t("universities.roommates")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
