"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  UserCircle,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { Footer } from "@/components/layout/footer";
import { LanguageMenu } from "@/components/layout/language-menu";
import { useAuth } from "@/context/auth-context";
import { ListingCard } from "@/components/listings/listing-card";
import { RoommateCard } from "@/components/roommates/roommate-card";
import { Carousel } from "@/components/ui/carousel";
import { useLocale } from "@/context/locale-context";
import { CITIES } from "@/lib/constants/cities";
import { DEFAULT_HOMEPAGE_SECTIONS, type PublicSettings } from "@/lib/data/public-settings";
import { type Testimonial } from "@/lib/data/testimonials";
import { universityDisplayName, type UniversityWithStats } from "@/lib/data/universities";
import { formatNumber } from "@/lib/utils/format";
import {
  resolveHomepageStats,
  type ResolvedStat,
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  EMPTY_HOMEPAGE_STAT_COUNTS,
  type HomepageStatCounts
} from "@/lib/utils/homepage-stats";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

export interface HomeInitialData {
  settings: PublicSettings;
  testimonials: Testimonial[];
  universities: UniversityWithStats[];
  featuredListings: Listing[];
  featuredRoommates: UserProfile[];
  statCounts: HomepageStatCounts;
}

export default function HomeClient({ initialData }: { initialData: HomeInitialData }) {
  const { locale, t } = useLocale();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchCity, setSearchCity] = useState("");
  const [searchBudget, setSearchBudget] = useState("");
  const [searchType, setSearchType] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Seeded from server-fetched data (SSR) — no client-side fetch waterfall. ISR
  // on the server page keeps this fresh. Empty arrays stay empty (sections hide).
  const [testimonials] = useState<Testimonial[]>(initialData.testimonials);
  const [settings] = useState<PublicSettings | null>(initialData.settings);
  const [featuredListings] = useState<Listing[]>(initialData.featuredListings);
  const [featuredRoommates] = useState<UserProfile[]>(initialData.featuredRoommates);
  const [featuredUniversities] = useState<UniversityWithStats[]>(initialData.universities);

  useEffect(() => {
    // Remember the last home-page search (restored after mount to avoid a
    // hydration mismatch with the server-rendered empty defaults).
    try {
      const saved = window.localStorage.getItem("roomi:home:search");
      if (saved) {
        const parsed = JSON.parse(saved) as { city?: string; budget?: string; type?: string };
        if (parsed.city) setSearchCity(parsed.city);
        if (parsed.budget) setSearchBudget(parsed.budget);
        if (parsed.type) setSearchType(parsed.type);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  function handleSearch() {
    try {
      window.localStorage.setItem(
        "roomi:home:search",
        JSON.stringify({ city: searchCity, budget: searchBudget, type: searchType })
      );
    } catch {
      // ignore quota errors
    }
    const params = new URLSearchParams();
    if (searchCity) params.set("city", searchCity);
    if (searchBudget) params.set("maxRent", searchBudget);
    if (searchType) params.set("listingType", searchType);
    router.push(`/rooms${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const sections = settings?.homepageSections ?? DEFAULT_HOMEPAGE_SECTIONS;
  const sectionOrder = sections.filter((s) => s.visible).map((s) => s.key);

  const heroLocaleContent = settings?.homepageHero?.[locale];
  const heroTitle = heroLocaleContent?.title?.trim() || null;
  const heroDescription = heroLocaleContent?.subtitle?.trim() || t("home.heroDescription");
  const heroImage = settings?.homepageHero?.imageUrl?.trim() || "/universities/main1.jpg";

  // Whatever the admin configured, in the order they configured it, with their
  // own labels. Nothing about which figures exist or what they are called is
  // compiled in — adding a fourth is a row in Admin -> Settings.
  const stats = resolveHomepageStats(
    settings?.homepageStats ?? DEFAULT_HOMEPAGE_STATS_CONFIG,
    initialData.statCounts ?? EMPTY_HOMEPAGE_STAT_COUNTS,
    locale
  );

  const steps = getSteps(locale);
  const platformStats = getPlatformStats(stats);
  const faqs = getFaqs(locale);
  const roommateHighlights = getRoommateHighlights(locale);
  const searchFields = [
    {
      icon: MapPin,
      label: t("home.searchCity"),
      element: (
        <select aria-label={t("home.searchCity")} value={searchCity} onChange={(e) => setSearchCity(e.target.value)}>
          <option value="">{t("home.searchCity")}</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      )
    },
    {
      icon: CalendarDays,
      label: t("home.searchBudget"),
      element: (
        <select aria-label={t("home.searchBudget")} value={searchBudget} onChange={(e) => setSearchBudget(e.target.value)}>
          <option value="">{t("home.searchBudget")}</option>
          {[25000, 40000, 50000, 75000, 100000, 150000, 200000, 300000].map((amount) => (
            <option key={amount} value={String(amount)}>
              {t("home.budgetUnder").replace("{amount}", amount.toLocaleString("en-US"))}
            </option>
          ))}
        </select>
      )
    },
    {
      icon: Home,
      label: t("home.searchType"),
      element: (
        <select aria-label={t("home.searchType")} value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="">{t("home.searchType")}</option>
          <option value="private_room">{t("listing.types.privateRoom")}</option>
          <option value="shared_room">{t("listing.types.sharedRoom")}</option>
          <option value="entire_place">{t("listing.types.entirePlace")}</option>
        </select>
      )
    }
  ];

  // The 5 admin-reorderable/toggleable sections (Admin > Homepage). Hero and
  // the "How it works" / final CTA bands stay structurally fixed since they
  // carry primary navigation and the closing conversion CTA.
  const sectionRenderers: Record<string, ReactNode> = {
    // Sections with no real content render nothing (null is skipped below).
    featured_listings: featuredListings.length === 0 ? null : (
      <section key="featured_listings" className="bg-[#fbf7f0] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <SectionHeader
              badge={t("home.featuredBadge")}
              title={t("home.featuredTitle")}
              description={t("home.featuredDescription")}
            />
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {t("home.viewAllListings")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Carousel
            className="mt-8"
            ariaLabel={t("home.featuredTitle")}
            itemClassName="basis-[86%] sm:basis-[47%] lg:basis-[31.5%]"
          >
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </Carousel>
        </div>
      </section>
    ),
    universities: featuredUniversities.length === 0 ? null : (
      <section key="universities" className="bg-[#fffdf9] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader title={t("home.universityTitle")} description={t("home.universityDescription")} />
            <Link href="/universities" className="text-sm font-semibold text-primary transition hover:text-primary/80">
              {t("home.exploreUniversityAreas")}
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {featuredUniversities.map((university) => (
              <Link
                key={university.id}
                href={`/rooms?university=${encodeURIComponent(university.name)}`}
                className="group overflow-hidden rounded-2xl border border-[#efe5d9] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[1.75rem]"
              >
                <div className="relative aspect-[1.6/1] overflow-hidden bg-surface-muted">
                  {university.imageUrl ? (
                    <Image
                      src={university.imageUrl}
                      alt={universityDisplayName(university, locale)}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 33vw, 50vw"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/15 to-accent/15 text-3xl font-bold text-primary/40">
                      {universityDisplayName(university, locale).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-4">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur sm:px-3 sm:py-1 sm:text-xs">
                      {university.city}
                    </span>
                  </div>
                </div>
                <div className="p-3 sm:p-5">
                  <h3 className="font-heading text-base font-bold leading-tight sm:text-2xl">
                    {universityDisplayName(university, locale)}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/55 sm:mt-2 sm:text-sm">
                    {university.listingsCount} {t("home.listingsWord")}
                    <span className="mx-1.5 text-[#d3c6b7] sm:mx-2">|</span>
                    {university.roommatesCount} {t("home.studentsWord")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    featured_roommates: featuredRoommates.length === 0 ? null : (
      <section key="featured_roommates" className="bg-primary px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="text-white">
            <SectionHeader
              badge={t("home.roommateBadge")}
              title={t("home.roommateTitle")}
              description={t("home.roommateDescription")}
              light
            />

            <div className="mt-8 space-y-4">
              {roommateHighlights.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/90">
                  <CheckCircle2 className="h-4 w-4 text-[#f8d79a]" />
                  {item}
                </div>
              ))}
            </div>

            <Link
              href="/roommates"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-[#f6f1e7]"
            >
              {t("home.browseAllRoommates")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Carousel ariaLabel={t("home.roommateTitle")} itemClassName="basis-[86%] sm:basis-[47%]">
            {featuredRoommates.map((profile) => (
              <RoommateCard key={profile.uid} profile={profile} />
            ))}
          </Carousel>
        </div>
      </section>
    ),
    testimonials: testimonials.length === 0 ? null : (
      <section key="testimonials" className="bg-[#fffdf9] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SectionHeader badge={t("home.testimonialBadge")} title={t("home.testimonialTitle")} centered />

          <Carousel className="mt-10" ariaLabel={t("home.testimonialTitle")}>
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="grid items-center gap-6 rounded-[2rem] border border-[#efe5d9] bg-white p-6 shadow-soft sm:gap-8 sm:p-8 md:grid-cols-[0.9fr_1.1fr] md:p-10"
              >
                <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-[1.75rem] bg-[#f5efe6] sm:h-56 sm:w-56">
                  <Image src={testimonial.image} alt={testimonial.name} fill className="object-cover" sizes="224px" />
                  <div className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-[#f1a531] text-white shadow-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[#f1a531]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-5 font-heading text-lg leading-8 text-foreground/80 sm:text-2xl sm:leading-9">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-foreground/55">{testimonial.role}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {testimonial.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </section>
    ),
    faq: (
      <section key="faq" className="bg-[#fbf7f0] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            badge={t("home.faqBadge")}
            title={t("home.faqTitle")}
            description={t("home.faqDescription")}
            centered
          />

          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                open={index === 0}
                className="group overflow-hidden rounded-[1.5rem] border border-[#ede2d4] bg-white shadow-soft"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left font-semibold marker:content-none">
                  <span>{faq.question}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4ecdf] text-foreground/60 transition group-open:rotate-180">
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 text-sm leading-7 text-foreground/60">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    )
  };

  return (
    <main id="main-content" className="min-h-screen bg-[#faf6ef] text-foreground">
      <section className="relative overflow-hidden">
        <Image
          src={heroImage}
          alt="Modern shared apartment"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/*
          Two-part scrim. The base gradient sets the overall mood; its middle
          stop used to fall to 0.35 exactly where the headline sits, which is
          why bright areas of the photo (walls, paintings, windows) swallowed
          the text. Raised to 0.44 so the copy band is never the lightest part
          of the image.
        */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,12,0.64)_0%,rgba(17,16,12,0.44)_30%,rgba(17,16,12,0.72)_100%)]" />
        {/*
          Focused scrim behind the copy only, so contrast is guaranteed no
          matter what the admin-uploaded hero image contains, while the photo
          stays visible at the edges. Combined with the base gradient this puts
          ~0.72 effective darkness behind the headline, which measures 4.2:1 for
          the brand tint against a pure-white image — the worst case any upload
          can produce — versus the 3:1 WCAG minimum for large text. Deliberately
          no stronger than that: the lightened tint does most of the work, so the
          photograph stays legible instead of being blacked out. Purely
          decorative and absolutely positioned, so it adds no layout box and
          cannot shift anything.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_125%_78%_at_50%_46%,rgba(17,16,12,0.50)_0%,rgba(17,16,12,0.44)_52%,rgba(17,16,12,0)_88%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <nav className="fixed inset-x-0 top-0 z-30 px-3 sm:px-6 lg:px-8">
            <div className="mx-auto mt-4 max-w-7xl rounded-[1.75rem] border border-white/15 bg-[rgba(16,14,12,0.5)] shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
                <Link href="/" className="flex items-center gap-2.5 text-white sm:gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lg sm:h-10 sm:w-10">
                    <Home className="h-5 w-5" />
                  </span>
                  <span className="font-heading text-lg font-bold sm:text-xl">
                    Room<span className="text-primary">i</span>
                  </span>
                </Link>

                <div className="hidden items-center gap-1 lg:flex">
                  <NavLink href="/rooms">{t("nav.rooms")}</NavLink>
                  <NavLink href="/roommates">{t("nav.roommates")}</NavLink>
                  <NavLink href="/list-a-room/step-1">{t("nav.listRoom")}</NavLink>
                </div>

                {/* Desktop actions — must reflect auth state immediately after
                    login (OAuth and email both redirect here). */}
                <div className="hidden items-center gap-2 lg:flex">
                  <LanguageMenu inverted />
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                      >
                        <UserCircle className="h-4 w-4" />
                        {t("nav.myAccount")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.signOut")}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                    >
                      {t("nav.signIn")}
                    </Link>
                  )}
                </div>

                {/* Mobile actions: language selector stays visible, links collapse into a menu */}
                <div className="flex items-center gap-2 lg:hidden">
                  <LanguageMenu inverted />
                  <button
                    type="button"
                    aria-label="Menu"
                    aria-expanded={mobileMenuOpen}
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {mobileMenuOpen ? (
                <div className="border-t border-white/10 px-3 py-3 lg:hidden">
                  <div className="grid gap-1">
                    <MobileNavLink href="/rooms" onClick={() => setMobileMenuOpen(false)}>
                      {t("nav.rooms")}
                    </MobileNavLink>
                    <MobileNavLink href="/roommates" onClick={() => setMobileMenuOpen(false)}>
                      {t("nav.roommates")}
                    </MobileNavLink>
                    <MobileNavLink href="/list-a-room/step-1" onClick={() => setMobileMenuOpen(false)}>
                      {t("nav.listRoom")}
                    </MobileNavLink>
                    {user ? (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="mt-1 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                          {t("nav.myAccount")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            void signOut();
                          }}
                          className="mt-1 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                        >
                          {t("nav.signOut")}
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/sign-in"
                        onClick={() => setMobileMenuOpen(false)}
                        className="mt-1 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                      >
                        {t("nav.signIn")}
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex min-h-[520px] items-center justify-center py-16 sm:min-h-[760px] sm:py-28 lg:min-h-[820px]">
            <div className="w-full max-w-4xl text-center">
              {/*
                The text-shadow is the third layer of defence: it holds the
                glyph edges apart from whatever detail sits directly behind them
                (picture frames, window mullions) even before the scrim is
                considered. It costs no layout space.
              */}
              <h1 className="text-[2rem] font-bold leading-tight text-white [text-shadow:0_2px_10px_rgba(17,16,12,0.55)] sm:text-5xl lg:text-7xl">
                {heroTitle ?? (
                  <>
                    {t("home.heroTitleLead")}{" "}
                    {/* Brand teal, lightened for photography — see --primary-on-dark. */}
                    <span className="text-primary-on-dark">{t("home.heroTitleAccent")}</span>
                  </>
                )}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
                {heroDescription}
              </p>

              <div className="mt-6 rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur-xl sm:mt-10 sm:p-3">
                <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                  {searchFields.map((field) => (
                    <div key={field.label} className="relative">
                      <field.icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                      <div className="[&_input]:w-full [&_input]:bg-white [&_input]:pl-11 [&_select]:w-full [&_select]:appearance-none [&_select]:bg-white [&_select]:pl-11">
                        {field.element}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-primary px-6 py-4 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    <Search className="h-4 w-4" />
                    {t("home.searchButton")}
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-white sm:mt-10 sm:gap-10">
                {stats.map((stat, index) => (
                  <div key={stat.key} className="flex items-center gap-5 sm:gap-10">
                    <div className="text-center">
                      <p className="text-2xl font-bold sm:text-3xl">
                        <CountUp value={stat.value} format={(n) => `${formatNumber(n)}${stat.suffix}`} />
                      </p>
                      <p className="mt-1 text-xs text-white/70 sm:text-sm">{stat.label}</p>
                    </div>
                    {index < stats.length - 1 ? <div className="hidden h-10 w-px bg-white/15 sm:block" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fffdf9] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            badge={t("home.howItWorksBadge")}
            title={
              <>
                {t("home.howItWorksTitle")} <span className="text-primary">{t("home.howItWorksAccent")}</span>
              </>
            }
            description={t("home.howItWorksDescription")}
            centered
          />

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.title} className="group relative" delayMs={index * 100}>
                <article className="rounded-[1.75rem] border border-[#eee2d2] bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-bold text-primary/15">{step.number}</span>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                      <step.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-6 font-heading text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-foreground/60">{step.text}</p>
                </article>
                {index < steps.length - 1 ? (
                  <ChevronRight className="absolute right-[-18px] top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[#d8cdbd] lg:block" />
                ) : null}
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
            {platformStats.map((stat) => (
              <div key={stat.key} className="text-center">
                <p className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sectionOrder.map((key) => sectionRenderers[key] ?? null)}

      <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=85"
            alt="Happy roommates"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[rgba(18,14,11,0.72)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-6 py-14 text-center shadow-2xl backdrop-blur-sm sm:px-10">
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{t("home.ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            {t("home.ctaDescription")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 hover:shadow-xl active:scale-95"
            >
              {t("home.startSearching")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/list-a-room/step-1"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20 active:scale-95"
            >
              {t("home.listYourRoom")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function SectionHeader({
  badge,
  title,
  description,
  centered = false,
  light = false
}: {
  badge?: string;
  title: React.ReactNode;
  description?: string;
  centered?: boolean;
  light?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      {badge ? (
        <span
          className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
            light ? "bg-white/10 text-white/80" : "bg-[#fde8c9] text-[#b97716]"
          }`}
        >
          {badge}
        </span>
      ) : null}
      <h2 className={`mt-3 text-2xl font-bold sm:mt-4 sm:text-4xl ${light ? "text-white" : "text-foreground"}`}>
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-2 max-w-2xl text-sm leading-6 sm:mt-3 sm:leading-7 sm:text-base ${centered ? "mx-auto" : ""} ${
            light ? "text-white/75" : "text-foreground/60"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function getSteps(locale: "en" | "ru" | "kz") {
  if (locale === "ru") {
    return [
      {
        icon: Users,
        number: "01",
        title: "Создайте профиль",
        text: "Укажите бюджет, университет, образ жизни и дату заезда, чтобы получать более точные совпадения."
      },
      {
        icon: Search,
        number: "02",
        title: "Ищите и фильтруйте",
        text: "Подбирайте комнаты и соседей по городу, кампусу, бюджету и совместимости."
      },
      {
        icon: MessageCircle,
        number: "03",
        title: "Общайтесь заранее",
        text: "Напишите потенциальным соседям, сравните ожидания и обсудите важные детали до встречи."
      },
      {
        icon: Home,
        number: "04",
        title: "Заселяйтесь уверенно",
        text: "Выбирайте лучший вариант и планируйте переезд вместе без лишнего стресса."
      }
    ];
  }

  if (locale === "kz") {
    return [
      {
        icon: Users,
        number: "01",
        title: "Профиль жасаңыз",
        text: "Дәлірек сәйкестік алу үшін бюджетіңізді, университетіңізді, өмір салтыңызды және көшу күніңізді енгізіңіз."
      },
      {
        icon: Search,
        number: "02",
        title: "Іздеп, сүзгіден өткізіңіз",
        text: "Қала, кампус, бюджет және үйлесім бойынша бөлмелер мен roommate табыңыз."
      },
      {
        icon: MessageCircle,
        number: "03",
        title: "Алдын ала сөйлесіңіз",
        text: "Кездеспей тұрып, ықтимал көршілерге жазып, күтілімдер мен маңызды детальдарды талқылаңыз."
      },
      {
        icon: Home,
        number: "04",
        title: "Сенімді қоныстаныңыз",
        text: "Ең қолайлы нұсқаны таңдап, көшуді бірге жоспарлаңыз."
      }
    ];
  }

  return [
    {
      icon: Users,
      number: "01",
      title: "Create Profile",
      text: "Sign up and share your budget, university, lifestyle, and move-in preferences."
    },
    {
      icon: Search,
      number: "02",
      title: "Browse & Filter",
      text: "Search rooms and roommates by city, university, budget, and compatibility."
    },
    {
      icon: MessageCircle,
      number: "03",
      title: "Connect & Chat",
      text: "Message potential roommates early, compare expectations, and ask the right questions."
    },
    {
      icon: Home,
      number: "04",
      title: "Move In Together",
      text: "Choose the right fit with more confidence and plan the next chapter together."
    }
  ];
}

/**
 * Platform stat tiles. Numeric values come from the admin-configured stats
 * engine (Admin → Settings → Homepage statistics) — the same source as the
 * hero counters — never hardcoded fake metrics. "100% free" is a factual
 * product claim, not a fabricated measurement.
 */
/**
 * The lower statistics strip.
 *
 * Renders exactly what the admin configured and nothing else. "100% Free" used
 * to be appended here in three hardcoded languages on the grounds that it was a
 * product claim rather than a measurement — but that still made it a figure on
 * the homepage that no operator could reword, translate or remove. It is a
 * seeded row in the statistics list now, like every other card.
 */
function getPlatformStats(stats: ResolvedStat[]) {
  return stats.map((stat) => ({
    key: stat.key,
    value: `${formatNumber(stat.value)}${stat.suffix}`,
    label: stat.label
  }));
}

function getRoommateHighlights(locale: "en" | "ru" | "kz") {
  if (locale === "ru") {
    return [
      "Оценка совместимости по образу жизни",
      "Проверенные студенческие и рабочие профили",
      "Фильтры по бюджету, району и привычкам",
      "Прямой чат до встречи"
    ];
  }

  if (locale === "kz") {
    return [
      "Өмір салты бойынша үйлесім бағасы",
      "Тексерілген студент және маман профилі",
      "Бюджет, орын және әдеттер бойынша сүзгі",
      "Кездесуге дейін тікелей чат"
    ];
  }

  return [
    "Lifestyle compatibility scoring",
    "Verified student and professional profiles",
    "Filter by budget, location, and habits",
    "Direct chat before meeting"
  ];
}

function getFaqs(locale: "en" | "ru" | "kz") {
  if (locale === "ru") {
    return [
      {
        question: "Как работает подбор соседа?",
        answer:
          "Система сравнивает бюджет, дату заезда, чистоту, режим сна, гостей и другие привычки, чтобы сильные совпадения поднимались выше."
      },
      {
        question: "Насколько безопасен Roomi?",
        answer:
          "Платформа строится вокруг проверенных профилей, деталей жилья и прозрачной активности, чтобы студентам было спокойнее принимать решения."
      },
      {
        question: "Сколько это стоит?",
        answer:
          "Поиск объявлений, соседей и старт общения остаются доступными, пока продукт растет и дополняется новыми инструментами."
      },
      {
        question: "Можно ли разместить свою комнату или квартиру?",
        answer:
          "Да. Вы можете опубликовать объявление, добавить фотографии, указать пожелания к соседу и общаться напрямую с заинтересованными людьми."
      },
      {
        question: "Какие города покрывает сервис?",
        answer:
          "Сейчас акцент на крупнейших студенческих центрах, таких как Алматы и Астана, с возможностью дальнейшего расширения."
      }
    ];
  }

  if (locale === "kz") {
    return [
      {
        question: "Roommate matching қалай жұмыс істейді?",
        answer:
          "Жүйе бюджет, көшу уақыты, тазалық, ұйқы тәртібі, қонақтар және басқа әдеттерді салыстырып, мықты сәйкестіктерді жоғары қояды."
      },
      {
        question: "Roomi қолдану қауіпсіз бе?",
        answer:
          "Платформа тексерілген профильдерге, тұрғын үй ақпаратына және ашық белсенділікке сүйеніп, студенттерге сенімдірек шешім қабылдауға көмектеседі."
      },
      {
        question: "Қанша тұрады?",
        answer:
          "Хабарландыруларды көру, roommate іздеу және сөйлесуді бастау әзірге қолжетімді және қарапайым болып қалады."
      },
      {
        question: "Өз бөлмемді немесе пәтерімді жариялай аламын ба?",
        answer:
          "Иә. Хабарландыру жариялап, фотосурет қосып, roommate талғамын көрсетіп, қызыққан адамдармен тікелей байланыса аласыз."
      },
      {
        question: "Қай қалалар қамтылған?",
        answer:
          "Қызмет қазір Алматы мен Астана сияқты негізгі студенттік хабтарға бағытталған және кейін кеңейе алады."
      }
    ];
  }

  return [
    {
      question: "How does the roommate matching work?",
      answer:
        "Our match score compares budget, move-in timing, cleanliness, sleep schedule, guests, and other lifestyle preferences so you can shortlist better fits faster."
    },
    {
      question: "Is it safe to use Roomi?",
      answer:
        "The platform is designed around verified profiles, room details, and reportable activity so students can make more confident decisions before meeting."
    },
    {
      question: "How much does it cost?",
      answer:
        "Browsing listings, discovering roommates, and starting conversations can remain accessible while the product grows with premium tools later if needed."
    },
    {
      question: "Can I list my room or apartment?",
      answer:
        "Yes. You can publish a listing, add photos, set roommate preferences, and connect directly with interested students or young professionals."
    },
    {
      question: "What cities in Kazakhstan do you cover?",
      answer:
        "The experience is designed around major student hubs like Almaty and Astana, with room to expand as the listing network grows."
    }
  ];
}
