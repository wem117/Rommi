export function SkeletonAuth() {
  return (
    <main className="min-h-screen bg-[#faf6ef] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-20 rounded-[2rem] bg-white/80" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="rounded-[2.25rem] bg-white/70 p-8">
            <div className="h-12 w-52 rounded-full bg-[#ebe2d5]" />
            <div className="mt-8 h-16 w-full max-w-[28rem] rounded-[1.5rem] bg-[#ece3d7]" />
            <div className="mt-4 h-16 w-full max-w-[24rem] rounded-[1.5rem] bg-[#f0e7db]" />
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[1.75rem] bg-[#efe6da]" />
              ))}
            </div>
          </section>

          <section className="rounded-[2.25rem] bg-white p-8">
            <div className="mx-auto h-10 w-56 rounded-full bg-[#efe6da]" />
            <div className="mx-auto mt-3 h-5 w-40 rounded-full bg-[#f3ebdf]" />
            <div className="mt-8 h-14 rounded-full bg-[#efe6da]" />
            <div className="mt-6 h-px bg-[#f0e7db]" />
            <div className="mt-6 h-14 rounded-[1.25rem] bg-[#f4ece2]" />
            <div className="mt-4 h-14 rounded-full bg-[#0f957d]/20" />
            <div className="mx-auto mt-5 h-5 w-48 rounded-full bg-[#f2e9dd]" />
          </section>
        </div>
      </div>
    </main>
  );
}
