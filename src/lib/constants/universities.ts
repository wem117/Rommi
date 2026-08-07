/**
 * Comprehensive list of major Kazakhstani universities, grouped by city.
 *
 * This is the OFFLINE FALLBACK / demo source. In production the canonical list
 * lives in the `public.universities` table and is managed from the admin panel
 * (see `src/lib/data/universities.ts`). Keep this in sync with the seed data in
 * `supabase/migrations (universities)` so demo and production match.
 */
export interface UniversityEntry {
  name: string;
  city: string;
}

export const KZ_UNIVERSITIES: UniversityEntry[] = [
  // Almaty
  { name: "Al-Farabi Kazakh National University", city: "Almaty" },
  { name: "KBTU", city: "Almaty" },
  { name: "SDU University", city: "Almaty" },
  { name: "Satbayev University", city: "Almaty" },
  { name: "KIMEP University", city: "Almaty" },
  { name: "Narxoz University", city: "Almaty" },
  { name: "Almaty Management University (AlmaU)", city: "Almaty" },
  { name: "International IT University", city: "Almaty" },
  { name: "Kazakh Ablai Khan University of International Relations and World Languages", city: "Almaty" },
  { name: "Kazakh National Pedagogical University named after Abai", city: "Almaty" },
  { name: "Kazakh National Medical University", city: "Almaty" },
  { name: "Turan University", city: "Almaty" },
  { name: "Kazakh National Agrarian Research University", city: "Almaty" },
  { name: "University of International Business (UIB)", city: "Almaty" },
  { name: "Almaty Technological University", city: "Almaty" },
  { name: "T. Zhurgenov Kazakh National Academy of Arts", city: "Almaty" },
  { name: "Kurmangazy Kazakh National Conservatory", city: "Almaty" },
  { name: "Kazakh National Women's Teacher Training University", city: "Almaty" },

  // Astana
  { name: "Nazarbayev University", city: "Astana" },
  { name: "L.N. Gumilyov Eurasian National University", city: "Astana" },
  { name: "Maqsut Narikbayev University (KAZGUU)", city: "Astana" },
  { name: "Astana IT University", city: "Astana" },
  { name: "S. Seifullin Kazakh Agrotechnical University", city: "Astana" },
  { name: "Astana Medical University", city: "Astana" },
  { name: "Kazakh University of Economics, Finance and International Trade", city: "Astana" },
  { name: "Eurasian Humanities Institute", city: "Astana" },
  { name: "Astana International University", city: "Astana" },
  { name: "Cardiff University Kazakhstan", city: "Astana" },

  // Shymkent
  { name: "M. Auezov South Kazakhstan University", city: "Shymkent" },
  { name: "South Kazakhstan Medical Academy", city: "Shymkent" },
  { name: "Ozbekali Zhanibekov South Kazakhstan Pedagogical University", city: "Shymkent" },
  { name: "Shymkent University", city: "Shymkent" },
  { name: "University of Miras", city: "Shymkent" },

  // Karaganda
  { name: "Karaganda Buketov University", city: "Karaganda" },
  { name: "Karaganda Technical University", city: "Karaganda" },
  { name: "Karaganda Medical University", city: "Karaganda" },
  { name: "Karaganda University of Kazpotrebsoyuz", city: "Karaganda" },

  // Aktobe
  { name: "K. Zhubanov Aktobe Regional University", city: "Aktobe" },
  { name: "West Kazakhstan Marat Ospanov Medical University", city: "Aktobe" },

  // Taraz
  { name: "M.Kh. Dulaty Taraz Regional University", city: "Taraz" },
  { name: "Taraz Innovative-Humanitarian University", city: "Taraz" },

  // Atyrau
  { name: "Atyrau University", city: "Atyrau" },
  { name: "Safi Utebayev Atyrau Oil and Gas University", city: "Atyrau" },

  // Pavlodar
  { name: "S. Toraighyrov Pavlodar State University", city: "Pavlodar" },
  { name: "Pavlodar Pedagogical University", city: "Pavlodar" },

  // Semey
  { name: "Shakarim University Semey", city: "Semey" },
  { name: "Semey Medical University", city: "Semey" },

  // Oskemen (Ust-Kamenogorsk)
  { name: "D. Serikbayev East Kazakhstan Technical University", city: "Oskemen" },
  { name: "Sarsen Amanzholov East Kazakhstan University", city: "Oskemen" },

  // Kostanay
  { name: "A. Baitursynov Kostanay Regional University", city: "Kostanay" },
  { name: "Kostanay Social-Technical University", city: "Kostanay" },

  // Kokshetau
  { name: "Sh. Ualikhanov Kokshetau University", city: "Kokshetau" },
  { name: "Abai Myrzakhmetov Kokshetau University", city: "Kokshetau" },

  // Petropavlovsk
  { name: "M. Kozybayev North Kazakhstan University", city: "Petropavlovsk" },

  // Turkistan
  { name: "Khoja Akhmet Yassawi International Kazakh-Turkish University", city: "Turkistan" },

  // Uralsk (Oral)
  { name: "M. Utemisov West Kazakhstan University", city: "Oral" },
  { name: "Zhangir Khan West Kazakhstan Agrarian-Technical University", city: "Oral" },

  // Kyzylorda
  { name: "Korkyt Ata Kyzylorda University", city: "Kyzylorda" },

  // Taldykorgan
  { name: "Ilyas Zhansugurov Zhetysu University", city: "Taldykorgan" }
];

/** Flat name list (backward compatible), plus an "Other" free-text escape hatch. */
export const UNIVERSITIES = [...KZ_UNIVERSITIES.map((u) => u.name), "Other"] as const;

/** All cities that have at least one university, plus the major hubs. */
export const UNIVERSITY_CITIES = Array.from(new Set(KZ_UNIVERSITIES.map((u) => u.city)));

// Fuzzy substring -> city map, kept for LEGACY free-text university values that
// may not exactly match an entry in KZ_UNIVERSITIES (older listings/profiles).
const UNIVERSITY_CITY_ENTRIES: Array<[string, string]> = [
  // Branch campuses are matched on the parent brand: posts and profiles write
  // "Cardiff", "Cardiff University" and "Cardiff Kazakhstan" interchangeably,
  // and all three mean the Astana campus.
  ["cardiff", "Astana"],
  ["al-farabi", "Almaty"],
  ["kaznu", "Almaty"],
  ["kbtu", "Almaty"],
  ["british technical", "Almaty"],
  ["sdu", "Almaty"],
  ["suleyman demirel", "Almaty"],
  ["satbayev", "Almaty"],
  ["kimep", "Almaty"],
  ["narxoz", "Almaty"],
  ["almau", "Almaty"],
  ["almaty management", "Almaty"],
  ["iitu", "Almaty"],
  ["ablai khan", "Almaty"],
  ["abai", "Almaty"],
  ["asfendiyarov", "Almaty"],
  ["kazakh national medical", "Almaty"],
  ["turan", "Almaty"],
  ["agrarian research", "Almaty"],
  ["international business", "Almaty"],
  ["almaty technological", "Almaty"],
  ["zhurgenov", "Almaty"],
  ["conservatory", "Almaty"],
  ["women's teacher", "Almaty"],
  ["nazarbayev", "Astana"],
  ["gumilyov", "Astana"],
  ["eurasian national", "Astana"],
  ["kazguu", "Astana"],
  ["narikbayev", "Astana"],
  ["astana it", "Astana"],
  ["seifullin", "Astana"],
  ["agrotechnical", "Astana"],
  ["astana medical", "Astana"],
  ["finance and international trade", "Astana"],
  ["eurasian humanities", "Astana"],
  ["astana international", "Astana"],
  ["auezov", "Shymkent"],
  ["south kazakhstan medical", "Shymkent"],
  ["zhanibekov", "Shymkent"],
  ["shymkent", "Shymkent"],
  ["miras", "Shymkent"],
  ["south kazakhstan", "Shymkent"],
  ["buketov", "Karaganda"],
  ["saginov", "Karaganda"],
  ["karaganda medical", "Karaganda"],
  ["kazpotrebsoyuz", "Karaganda"],
  ["karaganda", "Karaganda"],
  ["zhubanov", "Aktobe"],
  ["ospanov", "Aktobe"],
  ["aktobe", "Aktobe"],
  ["dulaty", "Taraz"],
  ["taraz", "Taraz"],
  ["dosmukhamedov", "Atyrau"],
  ["atyrau", "Atyrau"],
  ["toraighyrov", "Pavlodar"],
  ["pavlodar", "Pavlodar"],
  ["shakarim", "Semey"],
  ["semey", "Semey"],
  ["serikbayev", "Oskemen"],
  ["amanzholov", "Oskemen"],
  ["east kazakhstan", "Oskemen"],
  ["baitursynov", "Kostanay"],
  ["kostanay", "Kostanay"],
  ["ualikhanov", "Kokshetau"],
  ["myrzakhmetov", "Kokshetau"],
  ["kokshetau", "Kokshetau"],
  ["kozybayev", "Petropavlovsk"],
  ["north kazakhstan", "Petropavlovsk"],
  ["yassawi", "Turkistan"],
  ["turkistan", "Turkistan"],
  ["utemisov", "Oral"],
  ["zhangir khan", "Oral"],
  ["west kazakhstan", "Oral"],
  ["korkyt", "Kyzylorda"],
  ["kyzylorda", "Kyzylorda"],
  ["zhansugurov", "Taldykorgan"],
  ["zhetysu", "Taldykorgan"],
  ["taldykorgan", "Taldykorgan"]
];

const EXACT_CITY_BY_NAME = new Map(KZ_UNIVERSITIES.map((u) => [u.name.toLowerCase(), u.city]));

export function getUniversityCity(university: string | undefined | null): string {
  const value = (university ?? "").trim().toLowerCase();
  if (!value) return "Almaty";

  const exact = EXACT_CITY_BY_NAME.get(value);
  if (exact) return exact;

  const match = UNIVERSITY_CITY_ENTRIES.find(([needle]) => value.includes(needle));
  return match?.[1] ?? "Almaty";
}
