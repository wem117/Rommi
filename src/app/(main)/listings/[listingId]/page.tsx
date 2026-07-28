import { permanentRedirect } from "next/navigation";

// `/listings/<id>` is a legacy alias for the canonical `/rooms/<id>`. Redirect
// (308) instead of rendering the same content at two URLs — avoids duplicate
// content and consolidates SEO signals onto one canonical path.
export default async function Page({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  permanentRedirect(`/rooms/${listingId}`);
}
