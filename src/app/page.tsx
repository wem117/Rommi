import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { demoListings, demoProfiles, demoUniversities } from "@/lib/data/demo";
import { formatDate, formatMonthlyRent } from "@/lib/utils/format";

const stats = [
  { value: "3,500+", label: "Verified Listings" },
  { value: "10,000+", label: "Active Students" },
  { value: "2,400+", label: "Successful Matches" }
];

const steps = [
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

const platformStats = [
  { value: "3.5K+", label: "Active Listings" },
  { value: "94%", label: "Match Accuracy" },
  { value: "24h", label: "Avg Response Time" },
  { value: "100%", label: "Free to Use" }
];

const faqs = [
  {
    question: "How does the roommate matching work?",
    answer:
      "Our match score compares budget, move-in timing, cleanliness, sleep schedule, guests, and other lifestyle preferences so you can shortlist better fits faster."
  },
  {
    question: "Is it safe to use Roommate KZ?",
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

const testimonials = [
  {
    name: "Madina",
    role: "Student at KazNU",
    badge: "Verified Tenant",
    quote:
      "I found my perfect roommate in just 3 days. The platform felt safer, and the compatibility score was surprisingly accurate."
  }
];

const roommateHighlights = [
  "Lifestyle compatibility scoring",
  "Verified student and professional profiles",
  "Filter by budget, location, and habits",
  "Direct chat before meeting"
];

const listingTypeLabels: Record<(typeof demoListings)[number]["listingType"], string> = {
  private_room: "Private Room",
  shared_room: "Shared Room",
  entire_place: "Studio"
};

const mockSearchFields = [
  {
    icon: MapPin,
    label: "City or university...",
    element: <input aria-label="Search by city or university" placeholder="City or university..." />
  },
  {
    icon: CalendarDays,
    label: "Max budget (₸)",
    element: (
      <select aria-label="Max budget" defaultValue="">
        <option value="">Max budget (₸)</option>
        <option value="100000">Under 100K ₸</option>
        <option value="150000">Under 150K ₸</option>
        <option value="200000">Under 200K ₸</option>
        <option value="300000">Under 300K ₸</option>
      </select>
    )
  },
  {
    icon: Home,
    label: "Any type",
    element: (
      <select aria-label="Housing type" defaultValue="">
        <option value="">Any type</option>
        <option value="private_room">Private Room</option>
        <option value="shared_room">Shared Room</option>
        <option value="entire_place">Studio</option>
      </select>
    )
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#faf6ef] text-foreground">
      <section className="relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=85"
          alt="Modern shared apartment"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,12,0.62)_0%,rgba(17,16,12,0.35)_30%,rgba(17,16,12,0.72)_100%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <nav className="fixed left-0 right-0 top-0 z-30">
            <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-full border border-white/15 bg-[rgba(16,14,12,0.35)] px-4 py-3 shadow-xl backdrop-blur-md sm:px-6">
              <Link href="/" className="flex items-center gap-3 text-white">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-lg">
                  <Home className="h-5 w-5" />
                </span>
                <span className="font-heading text-lg font-bold sm:text-xl">
                  Roommate <span className="text-primary">KZ</span>
                </span>
              </Link>

              <div className="hidden items-center gap-1 md:flex">
                <NavLink href="/rooms">Rooms</NavLink>
                <NavLink href="/roommates">Roommates</NavLink>
                <NavLink href="/list-a-room/step-1">List a Room</NavLink>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 sm:inline-flex"
                >
                  EN / KZ
                </button>
                <Link
                  href="/sign-in"
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </nav>

          <div className="flex min-h-[700px] items-center justify-center py-24 sm:min-h-[760px] sm:py-28 lg:min-h-[820px]">
            <div className="max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#f1a531]" />
                #1 Roommate Finder in Kazakhstan
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-7xl">
                Find Your Perfect <span className="text-primary">Roommate & Room</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                Kazakhstan&apos;s trusted platform for students and young professionals. Connect with
                compatible roommates, browse verified listings, and find your next home.
              </p>

              <div className="mt-10 rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur-xl sm:p-3">
                <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                  {mockSearchFields.map((field) => (
                    <div key={field.label} className="relative">
                      <field.icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                      <div className="[&_input]:pl-11 [&_select]:pl-11 [&_select]:appearance-none [&_input]:bg-white [&_select]:bg-white">
                        {field.element}
                      </div>
                    </div>
                  ))}

                  <Link
                    href="/rooms"
                    className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-primary px-6 py-4 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Link>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white sm:gap-10">
                {stats.map((stat, index) => (
                  <div key={stat.label} className="flex items-center gap-6 sm:gap-10">
                    <div className="text-center">
                      <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
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

      <section className="bg-[#fffdf9] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            badge="How It Works"
            title={
              <>
                Find Your Place in <span className="text-primary">4 Steps</span>
              </>
            }
            description="Find your ideal roommate in four simple steps."
            centered
          />

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative group">
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
              </div>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
            {platformStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fbf7f0] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <SectionHeader
              badge="Featured Listings"
              title="Featured Listings"
              description="Hand-picked rooms and apartments near top universities."
            />
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              View All Listings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {demoListings.slice(0, 4).map((listing, index) => {
              const owner = demoProfiles.find((profile) => profile.uid === listing.ownerId);

              return (
                <Link
                  key={listing.id}
                  href={`/rooms/${listing.id}`}
                  className="group overflow-hidden rounded-[1.75rem] border border-[#efe5d9] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[1.12/1] overflow-hidden">
                    <Image
                      src={listing.photoUrls[0]}
                      alt={listing.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                        {listingTypeLabels[listing.listingType]}
                      </span>
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm">
                        Verified
                      </span>
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-[#f1a531] px-3 py-1 text-xs font-medium text-white shadow-sm">
                      {index === 2 ? "2 days" : "Today"}
                    </div>
                    {owner ? (
                      <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
                        <div className="relative h-6 w-6 overflow-hidden rounded-full bg-[#ece4d8]">
                          {owner.photoURL ? (
                            <Image src={owner.photoURL} alt={owner.fullName} fill className="object-cover" sizes="24px" />
                          ) : null}
                        </div>
                        <span className="pr-1 text-xs font-medium text-foreground">
                          {owner.fullName}, {owner.age}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-2 font-heading text-base font-bold text-foreground">
                          {listing.title}
                        </h3>
                        <p className="mt-2 flex items-center gap-1 text-xs text-foreground/55">
                          <MapPin className="h-3.5 w-3.5" />
                          {listing.city}, {listing.district}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatMonthlyRent(listing.monthlyRent)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-foreground/55">
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" />
                        {listing.bedrooms} bd
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {listing.bathrooms} ba
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(listing.availableFrom)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#fffdf9] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              title="Popular University Hubs"
              description="Find housing near Kazakhstan's top universities."
            />
            <Link href="/universities" className="text-sm font-semibold text-primary transition hover:text-primary/80">
              Explore university areas
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {demoUniversities.map((university, index) => (
              <Link
                key={university.name}
                href="/universities"
                className={`group overflow-hidden rounded-[1.75rem] border border-[#efe5d9] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "md:col-span-2 xl:col-span-1" : ""}`}
              >
                <div className="relative aspect-[1.6/1] overflow-hidden">
                  <Image
                    src={university.image}
                    alt={university.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {university.city}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-2xl font-bold">{university.name}</h3>
                  <p className="mt-2 text-sm text-foreground/55">
                    {university.listings} listings <span className="mx-2 text-[#d3c6b7]">|</span> {university.students} students
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="text-white">
            <SectionHeader
              badge="Find Compatible Roommates"
              title="Find Compatible Roommates"
              description="Our matching flow connects you with people who share your lifestyle and preferences."
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
              Browse All Roommates
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {demoProfiles.slice(0, 4).map((profile, index) => (
              <Link
                key={profile.uid}
                href={`/roommates/${profile.uid}`}
                className={`rounded-[1.75rem] bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index % 2 === 1 ? "sm:translate-y-5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#ece4d8]">
                    {profile.photoURL ? (
                      <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="48px" />
                    ) : null}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-bold">{profile.fullName}</h3>
                      {profile.verified ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="text-xs text-foreground/55">
                      {profile.age} · {profile.occupation}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8f3ef]">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${94 - index * 3}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary">{94 - index * 3}%</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/60">
                  <span className="rounded-full bg-[#f5efe6] px-3 py-1">{profile.lifestyle.smoking.replaceAll("_", " ")}</span>
                  <span className="rounded-full bg-[#f5efe6] px-3 py-1">{profile.lifestyle.cleanliness.replaceAll("_", " ")}</span>
                  <span className="rounded-full bg-[#f5efe6] px-3 py-1">{profile.lifestyle.sleepSchedule.replaceAll("_", " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffdf9] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SectionHeader badge="What Our Users Say" title="What Our Users Say" centered />

          <div className="mt-10 grid items-center gap-8 rounded-[2rem] border border-[#efe5d9] bg-white p-8 shadow-soft md:grid-cols-[0.9fr_1.1fr] md:p-10">
            <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-[1.75rem] bg-[#f5efe6]">
              <Image
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80"
                alt="Happy Roommate KZ user"
                fill
                className="object-cover"
                sizes="224px"
              />
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
              <blockquote className="mt-5 font-heading text-xl leading-9 text-foreground/80 sm:text-2xl">
                &quot;{testimonials[0].quote}&quot;
              </blockquote>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div>
                  <p className="font-semibold">{testimonials[0].name}</p>
                  <p className="text-sm text-foreground/55">{testimonials[0].role}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {testimonials[0].badge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbf7f0] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            badge="FAQ"
            title="Frequently Asked Questions"
            description="Everything you need to know about finding roommates in Kazakhstan."
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

      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
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
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to Find Your Perfect Roommate?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            Join thousands of students and young professionals already using Roommate KZ.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Start Searching
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/list-a-room/step-1"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              List Your Room
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ecdfce] bg-[#fffdf9]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-3 text-foreground">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-lg">
                <Home className="h-5 w-5" />
              </span>
              <span className="font-heading text-xl font-bold">
                Roommate <span className="text-primary">KZ</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-foreground/60">
              Kazakhstan&apos;s trusted roommate and housing platform for students and young professionals.
            </p>
          </div>

          <FooterColumn
            title="Platform"
            links={[
              { label: "Browse Rooms", href: "/rooms" },
              { label: "Find Roommates", href: "/roommates" },
              { label: "Universities", href: "/universities" }
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: "About Us", href: "/" },
              { label: "Contact", href: "/" },
              { label: "Careers", href: "/" }
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              { label: "Help Center", href: "/" },
              { label: "Terms of Service", href: "/" },
              { label: "Privacy Policy", href: "/" }
            ]}
          />
        </div>

        <div className="border-t border-[#ecdfce] px-4 py-5 text-center text-xs text-foreground/50">
          © 2026 Roommate KZ. All rights reserved.
        </div>
      </footer>
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
      <h2 className={`mt-4 text-3xl font-bold sm:text-4xl ${light ? "text-white" : "text-foreground"}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-base ${centered ? "mx-auto" : ""} ${light ? "text-white/75" : "text-foreground/60"}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FooterColumn({
  title,
  links
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/70">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm text-foreground/60">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="transition hover:text-primary">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
