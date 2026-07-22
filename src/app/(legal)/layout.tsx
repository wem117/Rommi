import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}
