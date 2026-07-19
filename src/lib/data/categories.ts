import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export const FALLBACK_PROPERTY_CATEGORIES: PropertyCategory[] = [
  { id: "apartment", name: "Apartment", slug: "apartment", icon: "Building2" },
  { id: "house", name: "House", slug: "house", icon: "Home" },
  { id: "dorm", name: "Dormitory", slug: "dorm", icon: "GraduationCap" },
  { id: "studio", name: "Studio", slug: "studio", icon: "DoorOpen" },
  { id: "private_room", name: "Private Room", slug: "private_room", icon: "BedSingle" },
  { id: "shared_room", name: "Shared Room", slug: "shared_room", icon: "Users" }
];

/**
 * Admin-managed property categories for listing forms and search filters.
 * Falls back to the platform's original fixed set when Supabase isn't
 * configured, the table is empty, or the query fails.
 */
export async function getActivePropertyCategories(): Promise<PropertyCategory[]> {
  if (!isSupabaseConfigured) return FALLBACK_PROPERTY_CATEGORIES;

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("property_categories")
      .select("id, name, slug, icon")
      .eq("active", true)
      .order("position", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_PROPERTY_CATEGORIES;
    return data;
  } catch {
    return FALLBACK_PROPERTY_CATEGORIES;
  }
}
