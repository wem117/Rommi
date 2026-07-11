import type { Conversation, Message } from "@/types/chat";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

const now = new Date();

export const demoProfiles: UserProfile[] = [
  {
    uid: "demo-yera",
    email: "yeraly@example.com",
    fullName: "Yeraly",
    age: 19,
    gender: "male",
    university: "KBTU",
    occupation: "Software Developer",
    minBudget: 120000,
    maxBudget: 190000,
    preferredMoveInDate: new Date("2026-07-01"),
    lifestyle: {
      smoking: "no",
      pets: "no_pets",
      cleanliness: "very_clean",
      sleepSchedule: "early_bird",
      guests: "rarely"
    },
    onboardingComplete: true,
    lookingForApartment: true,
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    bio: "Looking for a calm, tidy flat close to classes and coworking spots.",
    role: "user",
    verified: true,
    profileCompletion: 96,
    favoriteListingIds: ["listing-almaty-1"],
    favoriteRoommateIds: ["demo-aizhan"],
    viewedListingIds: ["listing-almaty-1", "listing-astana-1"],
    contactedListingIds: ["listing-almaty-1"],
    createdAt: now,
    updatedAt: now
  },
  {
    uid: "demo-aizhan",
    email: "aizhan@example.com",
    fullName: "Aizhan",
    age: 21,
    gender: "female",
    university: "KazNU",
    occupation: "Medical Student",
    minBudget: 100000,
    maxBudget: 160000,
    preferredMoveInDate: new Date("2026-08-15"),
    lifestyle: {
      smoking: "no",
      pets: "no_preference",
      cleanliness: "very_clean",
      sleepSchedule: "night_owl",
      guests: "rarely"
    },
    onboardingComplete: true,
    lookingForApartment: true,
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    bio: "Studying medicine and hoping to find a safe, quiet place near campus.",
    role: "user",
    verified: true,
    profileCompletion: 94,
    favoriteListingIds: [],
    favoriteRoommateIds: [],
    viewedListingIds: ["listing-almaty-2"],
    contactedListingIds: [],
    createdAt: now,
    updatedAt: now
  },
  {
    uid: "demo-temirbek",
    email: "temirbek@example.com",
    fullName: "Temirbek",
    age: 20,
    gender: "male",
    university: "KIMEP",
    occupation: "Information Systems",
    minBudget: 99000,
    maxBudget: 150000,
    preferredMoveInDate: null,
    lifestyle: {
      smoking: "no_preference",
      pets: "no_preference",
      cleanliness: "moderate",
      sleepSchedule: "balanced",
      guests: "sometimes"
    },
    onboardingComplete: true,
    lookingForApartment: false,
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    bio: "Demo administrator account.",
    role: "admin",
    verified: true,
    profileCompletion: 100,
    favoriteListingIds: [],
    favoriteRoommateIds: [],
    viewedListingIds: [],
    contactedListingIds: [],
    createdAt: now,
    updatedAt: now
  }
];

export const demoListings: Listing[] = [
  {
    id: "listing-almaty-1",
    ownerId: "demo-aidar",
    title: "Modern apartment near KBTU center",
    description: "Bright private room with a shared kitchen, fast WiFi, and a short walk to transit and cafes.",
    propertyType: "apartment",
    listingType: "private_room",
    monthlyRent: 180000,
    depositRequired: true,
    depositAmount: 50000,
    city: "Almaty",
    district: "Bogenbay Batyr",
    address: "Bogenbay Batyr 120",
    university: "KBTU",
    bedrooms: 2,
    bathrooms: 1,
    availableFrom: new Date("2026-07-01"),
    amenities: ["WiFi", "Kitchen", "Washing Machine", "Furnished", "Security"],
    preferences: { genderPreference: "any", smoking: "no", pets: "no_pets" },
    photoUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
    ],
    status: "approved",
    removed: false,
    removedAt: null,
    featured: true,
    featuredPosition: 0,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "listing-astana-1",
    ownerId: "demo-aizhan",
    title: "studio in Astana",
    description: "Great for one student or two close friends, with security and furnished interiors.",
    propertyType: "studio",
    listingType: "entire_place",
    monthlyRent: 220000,
    depositRequired: true,
    depositAmount: 80000,
    city: "Astana",
    district: "Nura",
    address: "Nursultan Ave 8",
    university: "Nazarbayev University",
    bedrooms: 1,
    bathrooms: 1,
    availableFrom: new Date("2026-07-10"),
    amenities: ["WiFi", "AC", "Gym", "Security", "Hot Water"],
    preferences: { genderPreference: "any", smoking: "no", pets: "allowed" },
    photoUrls: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"
    ],
    status: "approved",
    removed: false,
    removedAt: null,
    featured: true,
    featuredPosition: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "listing-almaty-2",
    ownerId: "demo-aizhan",
    title: "Shared room near KazNU for organized students",
    description: "Affordable option with a study corner, storage, and quick access to campus buses.",
    propertyType: "apartment",
    listingType: "shared_room",
    monthlyRent: 120000,
    depositRequired: false,
    depositAmount: 0,
    city: "Almaty",
    district: "Auezov",
    address: "Auezov 44",
    university: "Al-Farabi Kazakh National University",
    bedrooms: 4,
    bathrooms: 2,
    availableFrom: new Date("2026-09-01"),
    amenities: ["WiFi", "Kitchen", "Balcony", "Furnished"],
    preferences: { genderPreference: "female", smoking: "no", pets: "no_pets" },
    photoUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
    ],
    status: "approved",
    removed: false,
    removedAt: null,
    featured: false,
    featuredPosition: null,
    createdAt: now,
    updatedAt: now
  }
];

export const demoConversations: Conversation[] = [
  {
    id: "conversation-1",
    participantIds: ["demo-aidar", "demo-aizhan"],
    listingId: "listing-almaty-1",
    listingTitle: "Modern apartment near KBTU center",
    lastMessage: "Would Sunday work for a viewing?",
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    unreadCounts: { "demo-aidar": 0, "demo-aizhan": 1 }
  }
];

export const demoMessages: Message[] = [
  {
    id: "message-1",
    conversationId: "conversation-1",
    senderId: "demo-aidar",
    text: "Hi! The room is available from July 1. Are you interested?",
    imageUrl: null,
    createdAt: new Date(now.getTime() - 1000 * 60 * 45),
    readBy: ["demo-aidar", "demo-aizhan"]
  },
  {
    id: "message-2",
    conversationId: "conversation-1",
    senderId: "demo-aizhan",
    text: "Yes, it looks great. Would Sunday work for a viewing?",
    imageUrl: null,
    createdAt: new Date(now.getTime() - 1000 * 60 * 10),
    readBy: ["demo-aizhan"]
  }
];

export const demoUniversities = [
  {
  name: "KazNU",
  city: "Almaty",
  listings: 114,
  students: "18.0K",
  image: "/universities/kaznu.jpeg"
},
  {
    name: "KBTU",
    city: "Almaty",
    listings: 89,
    students: "8.5K",
    image: "/universities/kbtu.jpeg"
  },
  {
    name: "SDU",
    city: "Almaty",
    listings: 67,
    students: "6.2K",
    image: "/universities/sdu.jpeg"
  },
  {
    name: "AITU",
    city: "Astana",
    listings: 58,
    students: "7.4K",
    image: "/universities/aitu.jpg"
  },
  {
    name: "ENU",
    city: "Astana",
    listings: 76,
    students: "15.1K",
    image: "/universities/enu.JPG"
  },
  {
    name: "KIMEP University",
    city: "Almaty",
    listings: 63,
    students: "4.8K",
    image: "/universities/kimep.jpeg"
  }
];