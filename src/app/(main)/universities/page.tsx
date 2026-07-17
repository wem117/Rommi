"use client";

import { BedDouble, GraduationCap, MapPin, Users } from "lucide-react";
import Image from "next/image";
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
        <div className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[280px] animate-pulse rounded-[1.75rem] bg-card shadow-soft" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {universities.map((university) => (
            <article
              key={university.id}
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-36 overflow-hidden bg-surface-muted sm:h-40">
                {university.imageUrl ? (
                  <Image
                    src={university.imageUrl}
                    alt={university.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10">
                    <GraduationCap className="h-10 w-10 text-primary/50" />
                  </div>
                )}
                {university.city ? (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                    <MapPin className="h-3 w-3 text-primary" />
                    {university.city}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h2 className="font-heading text-lg font-bold leading-snug sm:text-xl">{university.name}</h2>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-foreground/60">
                  {university.description || t("universities.cardDescription")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/rooms?university=${encodeURIComponent(university.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    <BedDouble className="h-3.5 w-3.5" />
                    {t("universities.rooms")}
                  </Link>
                  <Link
                    href={`/roommates?university=${encodeURIComponent(university.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t("universities.roommates")}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
