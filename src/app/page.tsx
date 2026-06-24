import { ArrowRight, Building2, MessageCircle, Search, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { label: "listings", value: "3,500+" },
  { label: "students", value: "10,000+" },
  { label: "matches", value: "2,400+" }
];

const steps = [
  { icon: Users, title: "Create Profile", text: "Share your budget, university, and lifestyle." },
  { icon: Search, title: "Browse & Filter", text: "Find rooms and roommates by city, price, and fit." },
  { icon: MessageCircle, title: "Connect & Chat", text: "Start conversations before you commit." },
  { icon: ShieldCheck, title: "Move In Together", text: "Choose verified students and safer listings." }
];

const universities = ["KazNU", "KBTU", "SDU", "Nazarbayev University"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-[92vh] overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <Image
          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=85"
          alt="Bright student apartment living room"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#15100c]/55" />

        <div className="relative z-10 mx-auto flex min-h-[calc(92vh-3rem)] max-w-6xl flex-col">
          <nav className="flex items-center justify-between">
            <Link href="/" className="font-heading text-2xl font-bold text-white">
              Roommate KZ
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-soft"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex flex-1 flex-col justify-center pb-10 pt-16">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
                Student housing across Kazakhstan
              </p>
              <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                Find Your Perfect Roommate & Room
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                Match with compatible students, compare verified rooms, and move with confidence in
                Almaty, Astana, Shymkent, and beyond.
              </p>
            </div>

            <form className="mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-soft md:grid-cols-[1fr_1fr_1fr_auto]">
              <select aria-label="City" defaultValue="">
                <option value="">City</option>
                <option value="Almaty">Almaty</option>
                <option value="Astana">Astana</option>
                <option value="Shymkent">Shymkent</option>
              </select>
              <input aria-label="Max budget" type="number" placeholder="Max budget ₸" />
              <select aria-label="Room type" defaultValue="">
                <option value="">Type</option>
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

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/90 p-4 text-center shadow-soft">
                  <div className="font-heading text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase text-foreground/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold">How It Works</h2>
              <p className="mt-2 max-w-2xl text-foreground/65">
                A focused flow for students who need a room, a roommate, or both.
              </p>
            </div>
            <Link href="/sign-in" className="inline-flex items-center gap-2 font-semibold text-primary">
              Start matching
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step) => (
              <article key={step.title} className="rounded-2xl bg-white p-6 shadow-soft">
                <step.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-5 font-heading text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/65">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <Building2 className="h-9 w-9" />
            <h2 className="mt-4 text-3xl font-bold">University Hubs</h2>
            <p className="mt-3 text-white/80">
              Browse rooms and potential roommates around Kazakhstan&apos;s largest student
              communities.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {universities.map((university, index) => (
              <div key={university} className="rounded-2xl bg-white p-5 text-foreground shadow-soft">
                <div className="font-heading text-xl font-bold">{university}</div>
                <div className="mt-2 text-sm text-foreground/60">
                  {420 + index * 135} listings · {900 + index * 240} students
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 border-t border-border pt-6 text-sm text-foreground/60 sm:flex-row">
          <span className="font-heading font-bold text-foreground">Roommate KZ</span>
          <span>© 2026 Roommate KZ. Built for students in Kazakhstan.</span>
        </div>
      </footer>
    </main>
  );
}
