import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Link href="/" className="mb-8 font-heading text-3xl font-bold text-primary">
          Roommate KZ
        </Link>
        {children}
      </div>
    </main>
  );
}
