import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  badge: string;
}

/**
 * Shown on the home page when Supabase has no testimonial rows yet (or is not
 * configured), so the section always looks populated pre-launch.
 */
export const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    id: "demo-1",
    name: "Madina",
    role: "Student at KazNU",
    badge: "Verified Tenant",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80",
    quote:
      "Я нашла идеальную комнату для себя за 3 дня. Платформа очень удобная, а процент совместимости хорошо подбирает варианты."
  },
  {
    id: "demo-2",
    name: "Alikhan",
    role: "Student at Nazarbayev University",
    badge: "Verified Tenant",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80",
    quote:
      "Matching by lifestyle actually works. My roommate and I have the same sleep schedule and cleanliness habits — living together has been stress-free."
  },
  {
    id: "demo-3",
    name: "Aigerim",
    role: "Young professional in Almaty",
    badge: "Verified Host",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
    quote:
      "I listed my spare room and found a reliable roommate within a week. Chatting before meeting made it feel safe and simple."
  }
];

type TestimonialRow = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  image_url: string | null;
  badge: string | null;
};

export function mapTestimonialRow(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "",
    quote: row.quote,
    image: row.image_url ?? "",
    badge: row.badge ?? ""
  };
}

/**
 * Active testimonials for the public home page. Falls back to demo content when
 * Supabase is unconfigured, the table is missing, or there are no active rows.
 */
export async function getActiveTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return DEMO_TESTIMONIALS;

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("active", true)
      .order("position", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return DEMO_TESTIMONIALS;
    return data.map(mapTestimonialRow);
  } catch {
    return DEMO_TESTIMONIALS;
  }
}
