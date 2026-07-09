export const UNIVERSITIES = [
  "Al-Farabi Kazakh National University",
  "KBTU",
  "SDU University",
  "Satbayev University",
  "KIMEP University",
  "Narxoz University",
  "Kazakh Ablai Khan University of International Relations and World Languages",
  "Kazakh National Pedagogical University named after Abai",
  "Kazakh National Medical University",
  "Turan University",
  "International IT University",
  "Kazakh National Agrarian Research University",
  "Nazarbayev University",
  "L.N. Gumilyov Eurasian National University",
  "Astana IT University",
  "S. Seifullin Kazakh Agrotechnical University",
  "Astana Medical University",
  "M. Auezov South Kazakhstan University",
  "Karaganda Buketov University",
  "Karaganda Technical University",
  "K. Zhubanov Aktobe Regional University",
  "M.Kh. Dulaty Taraz Regional University",
  "S. Toraighyrov Pavlodar State University",
  "Shakarim University Semey",
  "D. Serikbayev East Kazakhstan Technical University",
  "A. Baitursynov Kostanay Regional University",
  "Atyrau University",
  "M. Utemisov West Kazakhstan University",
  "M. Kozybayev North Kazakhstan University",
  "Other"
] as const;

// One shared source of truth for university -> city, used by listings/roommates
// filtering and the /universities page. Previously this logic was copy-pasted
// (and out of sync, and Almaty/Astana-only) across three different components.
const UNIVERSITY_CITY_ENTRIES: Array<[string, string]> = [
  ["al-farabi", "Almaty"],
  ["kaznu", "Almaty"],
  ["kbtu", "Almaty"],
  ["sdu", "Almaty"],
  ["satbayev", "Almaty"],
  ["kimep", "Almaty"],
  ["narxoz", "Almaty"],
  ["ablai khan", "Almaty"],
  ["abai", "Almaty"],
  ["kazakh national medical", "Almaty"],
  ["turan", "Almaty"],
  ["international it university", "Almaty"],
  ["agrarian research", "Almaty"],
  ["nazarbayev", "Astana"],
  ["gumilyov", "Astana"],
  ["eurasian national", "Astana"],
  ["astana it", "Astana"],
  ["agrotechnical", "Astana"],
  ["astana medical", "Astana"],
  ["auezov", "Shymkent"],
  ["south kazakhstan", "Shymkent"],
  ["buketov", "Karaganda"],
  ["karaganda", "Karaganda"],
  ["zhubanov", "Aktobe"],
  ["aktobe", "Aktobe"],
  ["dulaty", "Taraz"],
  ["taraz", "Taraz"],
  ["toraighyrov", "Pavlodar"],
  ["pavlodar", "Pavlodar"],
  ["shakarim", "Semey"],
  ["semey", "Semey"],
  ["serikbayev", "Ust-Kamenogorsk"],
  ["east kazakhstan", "Ust-Kamenogorsk"],
  ["baitursynov", "Kostanay"],
  ["kostanay", "Kostanay"],
  ["atyrau", "Atyrau"],
  ["utemisov", "Oral"],
  ["west kazakhstan", "Oral"],
  ["kozybayev", "Petropavlovsk"],
  ["north kazakhstan", "Petropavlovsk"]
];

export function getUniversityCity(university: string | undefined | null): string {
  const value = (university ?? "").toLowerCase();
  const match = UNIVERSITY_CITY_ENTRIES.find(([needle]) => value.includes(needle));
  return match?.[1] ?? "Almaty";
}
