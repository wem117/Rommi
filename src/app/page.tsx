import { getHomepageData } from "@/lib/data/homepage-server";

import HomeClient from "./home-client";

// Server-rendered homepage with ISR: featured listings/roommates/universities,
// testimonials, and platform settings are fetched on the server in one round
// trip and streamed as real HTML (SEO + fast first paint). The client island
// handles search, locale, animations, and the mobile menu.
export const revalidate = 120;

export default async function Page() {
  const initialData = await getHomepageData();
  return <HomeClient initialData={initialData} />;
}
