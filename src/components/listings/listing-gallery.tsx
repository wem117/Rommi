import Image from "next/image";

export function ListingGallery({ photos, title }: { photos: string[]; title: string }) {
  if (!photos.length) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-white text-sm font-medium text-foreground/50 shadow-soft">
        No photos added
      </div>
    );
  }

  const [cover, ...rest] = photos;

  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-background shadow-soft">
        <Image src={cover} alt={title} fill priority className="object-cover" sizes="(min-width: 768px) 60vw, 100vw" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rest.slice(0, 4).map((photo, index) => (
          <div key={photo} className="relative min-h-32 overflow-hidden rounded-2xl bg-background shadow-soft">
            <Image src={photo} alt={`${title} ${index + 2}`} fill className="object-cover" sizes="25vw" />
          </div>
        ))}
      </div>
    </div>
  );
}
