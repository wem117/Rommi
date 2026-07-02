export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  storageBucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "roommate-assets",
  googleRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO ?? "",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com"
};

export const isSupabaseConfigured =
  Boolean(supabaseConfig.url) && Boolean(supabaseConfig.anonKey);
