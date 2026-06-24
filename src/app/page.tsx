import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { demoListings, demoProfiles, demoUniversities } from "@/lib/data/demo";
import { formatMonthlyRent } from "@/lib/utils/format";

const stats = [
  { label: "Verified listings", value: "3,500+" },
  { label: "Active students", value: "10,000+" },
  { label: "Successful matches", value: "2,400+" }
];

const steps = [
  { icon: Users, title: "Create Profile", text: "Tell us your budget, campus, move-in date, and habits." },
  { icon: Search, title: "Browse & Filter", text: "Find rooms or roommates by city, fit, and availability." },
  { icon: MessageCircle, title: "Connect & Chat", text: "Reach out early and compare expectations before moving." },
  { icon: ShieldCheck, title: "Move In Together", text: "Shortlist verified people and safer listings with more confidence." }
];

const faqs = [
  {
    question: "How does roommate matching work?",
    answer:
      "Profiles compare lifestyle preferences, move-in timing, and budget range to highlight stronger fits before you message."
  },
  {
    question: "Why migrate to Supabase?",
    answer:
      "The new stack makes auth, storage, SQL reporting, and future integrations more modular than the previous Firebase setup."
  },
  {
    question: "Can landlords list rooms too?",
    answer:
      "Yes. The listing flow now supports both student hosts and professional landlords while keeping the student-first UX."
  }
];

const testimonials = [
  {
    name: "Madina",
    role: "Student at KazNU",
    quote: "The match score helped me avoid awkward viewings and find a calm flatmate in a week."
  },
  {
    name: "Timur",
    role: "Junior Developer",
    quote: "The new filters made it much easier to compare furnished options near transit and campus."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f2e9] text-foreground">
      <section className="relative overflow-hidden px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <Image
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=85"
          alt="Bright apartment living room"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,17,12,0.78)_0%,rgba(22,17,12,0.48)_60%,rgba(22,17,12,0.58)_100%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex min-h-[88vh] flex-col justify-center py-10">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                #1 roommate finder for Kazakhstan students
              </p>
              <h1 className="mt-6 text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                Find Your Perfect
                <span className="block text-[#10b39e]">Roommate & Room</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                A more complete student housing platform with better discovery, stronger trust cues,
                and a modular Supabase foundation ready for real growth.
              </p>
            </div>

            <form className="mt-10 grid gap-3 rounded-[2rem] bg-white/95 p-3 shadow-2xl backdrop-blur md:grid-cols-[1.3fr_1fr_1fr_auto]">
              <input aria-label="Search" placeholder="City or university..." />
              <input aria-label="Max budget" type="number" placeholder="Max budget (T)" />
              <select aria-label="Room type" defaultValue="">
                <option value="">Any type</option>
                <option value="private_room">Private room</option>
                <option value="shared_room">Shared room</option>
                <option value="entire_place">Entire place</option>
              </select>
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white"
              >
                Search
                <ArrowRight className="h-4 w-4" />
              </Link>
            </form>

            <div className="mt-10 grid max-w-3xl grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-white/90 p-5 text-center shadow-soft">
                  <div className="font-heading text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex rounded-full bg-[#ffe8c2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b77719]">
            Featured listings
          </p>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-4xl font-bold">Featured Listings</h2>
              <p className="mt-2 max-w-2xl text-foreground/65">
                Hand-picked rooms and apartments near top universities and transit hubs.
              </p>
            </div>
            <Link href="/rooms" className="inline-flex items-center gap-2 font-semibold text-primary">
              View all listings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {demoListings.map((listing, index) => (
              <article key={listing.id} className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
                <div className="relative aspect-[4/3]">
                  <Image src={listing.photoUrls[0]} alt={listing.title} fill className="object-cover" sizes="33vw" />
                  <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold">
                    {listing.listingType.replaceAll("_", " ")}
                  </div>
                  <div className="absolute right-4 top-4 rounded-full bg-[#10b39e] px-3 py-1 text-xs font-semibold text-white">
                    {index === 1 ? "Flexible" : "Verified"}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold">{listing.title}</h3>
                      <p className="mt-1 text-sm text-foreground/60">
                        {listing.city}, {listing.district}
                      </p>
                    </div>
                    <div className="text-right font-heading text-lg font-bold text-primary">
                      {formatMonthlyRent(listing.monthlyRent)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-foreground/55">
                    <span>{listing.bedrooms} bd</span>
                    <span>•</span>
                    <span>{listing.bathrooms} ba</span>
                    <span>•</span>
                    <span>{demoProfiles.find((profile) => profile.uid === listing.ownerId)?.fullName}, {demoProfiles.find((profile) => profile.uid === listing.ownerId)?.age}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-primary px-8 py-12 text-white">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                Compatible roommates
              </p>
              <h2 className="mt-5 text-4xl font-bold">Find compatible roommates, not just spare beds</h2>
              <ul className="mt-6 space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Lifestyle compatibility scoring
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified student and professional profiles
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Filter by budget, location, and habits
                </li>
              </ul>
              <Link
                href="/roommates"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary"
              >
                Browse roommates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {demoProfiles.slice(0, 2).map((profile, index) => (
                <article key={profile.uid} className={`rounded-[2rem] bg-white p-5 text-foreground shadow-soft ${index === 1 ? "sm:translate-y-8" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-background">
                      {profile.photoURL ? (
                        <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="56px" />
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold">{profile.fullName}</h3>
                      <p className="text-sm text-foreground/55">
                        {profile.age} • {profile.university}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-primary/10">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${91 - index * 5}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">{91 - index * 5}% compatibility</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/60">
                    <span className="rounded-full bg-background px-3 py-1">{profile.lifestyle.cleanliness.replaceAll("_", " ")}</span>
                    <span className="rounded-full bg-background px-3 py-1">{profile.lifestyle.sleepSchedule.replaceAll("_", " ")}</span>
                    <span className="rounded-full bg-background px-3 py-1">{profile.lifestyle.guests.replaceAll("_", " ")}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-[#ffe8c2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b77719]">
              How it works
            </p>
            <h2 className="mt-5 text-4xl font-bold">
              Find Your Place in <span className="text-primary">4 Steps</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-bold text-primary/15">{String(index + 1).padStart(2, "0")}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/60">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-4xl font-bold">Popular University Hubs</h2>
              <p className="mt-2 max-w-2xl text-foreground/65">
                Browse housing around Kazakhstan&apos;s largest student communities.
              </p>
            </div>
            <Building2 className="h-10 w-10 text-primary" />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {demoUniversities.map((university) => (
              <article key={university.name} className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
                <div className="relative aspect-[5/3]">
                  <Image src={university.image} alt={university.name} fill className="object-cover" sizes="33vw" />
                  <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
                    {university.city}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-2xl font-bold">{university.name}</h3>
                  <p className="mt-2 text-sm text-foreground/60">{university.listings} listings • {university.students} students</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-[2rem] bg-white p-8 shadow-soft">
              <Sparkles className="h-6 w-6 text-[#d98a10]" />
              <p className="mt-5 text-lg leading-8 text-foreground/75">&quot;{testimonial.quote}&quot;</p>
              <div className="mt-6">
                <h3 className="font-semibold">{testimonial.name}</h3>
                <p className="text-sm text-foreground/55">{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-[#ffe8c2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b77719]">
              FAQ
            </p>
            <h2 className="mt-5 text-4xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((item) => (
              <article key={item.question} className="rounded-[2rem] bg-white p-6 shadow-soft">
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/65">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#17120e] px-8 py-14 text-white">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-4xl font-bold">Ready to find your perfect roommate?</h2>
            <p className="mt-4 max-w-2xl text-white/75">
              Join thousands of students already browsing rooms, matches, and campus neighborhoods.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/rooms" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                Start searching
              </Link>
              <Link href="/list-a-room/step-1" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white">
                List your room
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
