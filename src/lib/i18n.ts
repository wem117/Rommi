export type Locale = "en" | "ru" | "kz";

export const localeOptions = [
  { value: "en", code: "EN", label: "English", nativeLabel: "English" },
  { value: "ru", code: "RU", label: "Russian", nativeLabel: "Русский" },
  { value: "kz", code: "KZ", label: "Kazakh", nativeLabel: "Қазақша" }
] as const satisfies ReadonlyArray<{
  value: Locale;
  code: string;
  label: string;
  nativeLabel: string;
}>;

const translations = {
  en: {
    nav: {
      rooms: "Rooms",
      roommates: "Roommates",
      listRoom: "List a Room",
      myAccount: "My Account",
      signIn: "Sign In",
      signOut: "Sign Out",
      loading: "Loading",
      chooseLanguage: "Choose language",
    },
    home: {
      heroBadge: "#1 Roommate Finder in Kazakhstan",
      heroTitleLead: "Find Your Perfect",
      heroTitleAccent: "Roommate & Room",
      heroDescription:
        "Kazakhstan's trusted platform for students and young professionals. Connect with compatible roommates, browse verified listings, and find your next home.",
      searchCity: "City or university...",
      searchBudget: "Max budget (₸)",
      searchType: "Any type",
      searchButton: "Search",
      verifiedListings: "Verified Listings",
      activeStudents: "Active Students",
      successfulMatches: "Successful Matches",
      howItWorksBadge: "How It Works",
      howItWorksTitle: "Find Your Place in",
      howItWorksAccent: "4 Steps",
      howItWorksDescription: "Find your ideal roommate in four simple steps.",
      featuredBadge: "Featured Listings",
      featuredTitle: "Featured Listings",
      featuredDescription: "Hand-picked rooms and apartments near top universities.",
      viewAllListings: "View All Listings",
      universityTitle: "Popular University Hubs",
      universityDescription: "Find housing near Kazakhstan's top universities.",
      exploreUniversityAreas: "Explore university areas",
      roommateBadge: "Find Compatible Roommates",
      roommateTitle: "Find Compatible Roommates",
      roommateDescription:
        "Our matching flow connects you with people who share your lifestyle and preferences.",
      browseAllRoommates: "Browse All Roommates",
      testimonialBadge: "What Our Users Say",
      testimonialTitle: "What Our Users Say",
      faqBadge: "FAQ",
      faqTitle: "Frequently Asked Questions",
      faqDescription: "Everything you need to know about finding roommates in Kazakhstan.",
      ctaTitle: "Ready to Find Your Perfect Roommate?",
      ctaDescription: "Join thousands of students and young professionals already using Roommate KZ.",
      startSearching: "Start Searching",
      listYourRoom: "List Your Room"
    },
    profile: {
      overview: "Overview",
      chats: "Chats",
      savedListings: "Saved Listings",
      history: "History",
      noBio: "No bio added yet.",
      visible: "Visible in roommate search",
      hidden: "Hidden from roommate search",
      editProfile: "Edit profile",
      complete: "complete",
      housingPreferences: "Housing Preferences",
      lifestylePreferences: "Lifestyle Preferences",
      budget: "Budget",
      moveIn: "Move-in",
      gender: "Gender",
      searchVisibility: "Roommate search visibility",
      searchVisibilityDescription:
        "Turn this on to publish your roommate profile automatically using your saved age, budget, university, lifestyle, and bio.",
      searchVisibilityOn: "Your profile is live in roommate search.",
      searchVisibilityOff: "Your profile is hidden from roommate search.",
      saving: "Saving...",
      emptyChatsTitle: "No chats yet",
      emptyChatsText:
        "Start messaging roommates or listing owners and your conversations will appear here.",
      emptyRoomsTitle: "No saved rooms",
      emptyRoomsText: "Tap the heart on a listing to save it for later.",
      emptyRoommatesTitle: "No saved roommates",
      emptyRoommatesText: "Tap the heart on roommate cards to build your shortlist.",
      emptyHistoryTitle: "No listing history yet",
      emptyHistoryText: "Viewed and contacted listings will show up here automatically.",
      viewListing: "View Listing",
      remove: "Remove",
      viewProfile: "View Profile",
      savedRooms: "Saved Rooms",
      savedRoommates: "Saved Roommates",
      contacted: "Contacted",
      viewed: "Viewed",
      openChat: "Open chat",
      noMessages: "No messages yet"
    },
    rooms: {
      badge: "Browse Rooms",
      title: "Verified rooms across Kazakhstan",
      description:
        "Search by location, budget, and housing type to find student-friendly rooms and shared apartments that fit your lifestyle.",
      listRoom: "List a Room",
      unavailableTitle: "Listings unavailable",
      retry: "Retry",
      emptyTitle: "No listings yet",
      emptyText: "Create the first room listing to start the marketplace.",
      loadMore: "Load more"
    },
    listingFilters: {
      search: "Search",
      searchPlaceholder: "Search by location, university, or keywords...",
      filters: "Filters",
      found: "listings found",
      reset: "Reset",
      allCities: "All cities",
      allTypes: "All types",
      maxRent: "Max rent",
      newest: "Newest",
      rentLow: "Rent low",
      rentHigh: "Rent high"
    },
    listing: {
      noPhoto: "No photo",
      verified: "Verified",
      currentRoommate: "Current roommate",
      message: "Message",
      types: {
        apartment: "Apartment",
        house: "House",
        dorm: "Dorm",
        studio: "Studio",
        privateRoom: "Private Room",
        sharedRoom: "Shared Room",
        entirePlace: "Entire Place"
      }
    },
    listingForm: {
      pageTitle: "List a room",
      pageDescription: "Publish a real room listing connected to your account.",
      publish: "Publish Listing",
      publishSuccess: "Listing published",
      publishError: "Could not publish listing",
      title: "Title",
      description: "Description",
      propertyType: "Property type",
      listingType: "Listing type",
      monthlyRent: "Monthly rent (₸)",
      depositRequired: "Deposit required?",
      depositHelp: "Turn this on if tenants must pay a deposit upfront.",
      depositAmount: "Deposit amount (₸)",
      availableFrom: "Available from",
      city: "City",
      selectCity: "Select city",
      district: "District",
      address: "Full address",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      amenities: "Amenities",
      genderPreference: "Gender preference",
      smoking: "Smoking",
      pets: "Pets",
      any: "Any",
      male: "Male",
      female: "Female",
      no: "No",
      yes: "Yes",
      noPets: "No pets",
      allowed: "Allowed",
      photos: "Photos",
      photosHelp: "JPG, JPEG, PNG, WEBP. Max 5 MB each, 10 images total.",
      addPhotos: "Add photos",
      removePhoto: "Remove photo",
      photoEmpty: "Add at least one clear photo to make your listing easier to trust.",
      maxImages: "Listings can have up to 10 images",
      delete: "Delete Listing"
    },
    roommates: {
      title: "Find Roommates",
      description: "Discover compatible roommates based on lifestyle, budget, and location.",
      city: "City",
      gender: "Gender",
      minAge: "Min Age",
      maxAge: "Max Age",
      maxBudget: "Max Budget",
      found: "roommates found",
      unavailableTitle: "Roommates unavailable",
      retry: "Retry",
      emptyTitle: "No roommate profiles match these filters",
      emptyText: "Try widening the age, budget, or city filters to discover more people.",
      all: "All",
      any: "Any",
      allCities: "All Cities",
      other: "Other",
      preferNotToSay: "Prefer not to say",
      connect: "Connect",
      cardFallbackBio:
        "Looking for a clean, respectful roommate with a compatible routine and shared budget expectations."
    }
  },
  ru: {
    nav: {
      rooms: "Комнаты",
      roommates: "Соседи",
      listRoom: "Сдать жилье",
      myAccount: "Мой аккаунт",
      signIn: "Войти",
      signOut: "Выйти",
      loading: "Загрузка",
      chooseLanguage: "Выберите язык",
    },
    home: { /* ... same as before ... */ },
    profile: { /* ... same as before ... */ },
    rooms: { /* ... same as before ... */ },
    listingFilters: { /* ... same as before ... */ },
    listing: { /* ... same as before ... */ },
    listingForm: { /* ... same as before ... */ },
    roommates: { /* ... same as before ... */ }
  },
  kz: {
    nav: {
      rooms: "Бөлмелер",
      roommates: "Көршілер",
      listRoom: "Бөлме жариялау",
      myAccount: "Менің аккаунтым",
      signIn: "Кіру",
      signOut: "Шығу",
      loading: "Жүктелуде",
      chooseLanguage: "Тілді таңдаңыз",
    },
    home: { /* ... same as before ... */ },
    profile: { /* ... same as before ... */ },
    rooms: { /* ... same as before ... */ },
    listingFilters: { /* ... same as before ... */ },
    listing: { /* ... same as before ... */ },
    listingForm: { /* ... same as before ... */ },
    roommates: { /* ... same as before ... */ }
  }
} as const;

export function translate(locale: Locale, key: string) {
  const source = translations[locale] ?? translations.en;
  
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);

  if (typeof value === "string") {
    return value;
  }

  // Hide missing description key
  if (key === "nav.languageDescription") {
    return "";
  }

  const fallback = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, translations.en);

  return typeof fallback === "string" ? fallback : key;
}