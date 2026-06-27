"use client";

import { MessageCircle, Pencil, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import { useConversations } from "@/hooks/use-conversations";
import { useFavorites } from "@/hooks/use-favorites";
import { useListings } from "@/hooks/use-listings";
import { getProfileById } from "@/lib/data/profiles";
import { formatCurrency, formatDate, formatListingPrice } from "@/lib/utils/format";
import { profileCompletion } from "@/lib/utils/compatibility";
import type { Conversation } from "@/types/chat";
import type { UserProfile } from "@/types/user";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "chats", label: "Chats" },
  { id: "saved", label: "Saved Listings" },
  { id: "history", label: "History" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { conversations, loading: conversationsLoading } = useConversations();
  const { listings, loading: listingsLoading } = useListings();
  const {
    favoriteListingIds,
    favoriteRoommateIds,
    toggleFavorite,
    toggleFavoriteRoommate
  } = useFavorites();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [savedRoommates, setSavedRoommates] = useState<UserProfile[]>([]);
  const [conversationProfiles, setConversationProfiles] = useState<Record<string, UserProfile | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSavedRoommates() {
      if (!favoriteRoommateIds.length) {
        if (!cancelled) setSavedRoommates([]);
        return;
      }

      const roommates = await Promise.all(favoriteRoommateIds.map((id) => getProfileById(id)));
      if (!cancelled) {
        setSavedRoommates(roommates.filter((roommate): roommate is UserProfile => Boolean(roommate)));
      }
    }

    void loadSavedRoommates();
    return () => {
      cancelled = true;
    };
  }, [favoriteRoommateIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversationProfiles() {
      if (!user || !conversations.length) {
        if (!cancelled) setConversationProfiles({});
        return;
      }

      const participantIds = [...new Set(
        conversations
          .flatMap((conversation) => conversation.participantIds)
          .filter((participantId) => participantId !== user.uid)
      )];

      const profiles = await Promise.all(
        participantIds.map(async (participantId) => [participantId, await getProfileById(participantId)] as const)
      );

      if (!cancelled) {
        setConversationProfiles(Object.fromEntries(profiles));
      }
    }

    void loadConversationProfiles();
    return () => {
      cancelled = true;
    };
  }, [conversations, user]);

  if (!profile) return null;

  const completion = profile.profileCompletion ?? profileCompletion(profile);
  const favoriteListings = listings.filter((listing) => favoriteListingIds.includes(listing.id));
  const historyListings = getHistoryListings(listings, profile.viewedListingIds, profile.contactedListingIds);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative h-28 w-28 overflow-hidden rounded-full bg-background">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="112px" />
              ) : (
                <div className="grid h-full place-items-center text-4xl font-bold text-primary">
                  {profile.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{profile.fullName}</h1>
                <VerifiedBadge verified={profile.verified || user?.emailVerified} />
              </div>
              <p className="mt-2 max-w-2xl text-foreground/65">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={profile.university} />
                <StatusBadge label={profile.occupation} />
                <StatusBadge label={`${profile.age} years old`} />
                <StatusBadge
                  label={profile.lookingForApartment ? "Visible in roommate search" : "Hidden from roommate search"}
                  active={profile.lookingForApartment}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/profile/edit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit profile
            </Link>
            <div className="rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {completion}% complete
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e2d6c8]">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-primary text-white" : "bg-background text-foreground/65 hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Housing Preferences">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Info
                    label="Budget"
                    value={`${formatCurrency(profile.minBudget)} - ${formatCurrency(profile.maxBudget)}`}
                  />
                  <Info label="Move-in" value={formatDate(profile.preferredMoveInDate)} />
                  <Info label="Gender" value={profile.gender.replaceAll("_", " ")} />
                </div>
              </Panel>

              <Panel title="Lifestyle Preferences">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(profile.lifestyle).map(([key, value]) => (
                    <Info
                      key={key}
                      label={key.replace(/([A-Z])/g, " $1")}
                      value={String(value).replaceAll("_", " ")}
                    />
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}

          {activeTab === "chats" ? (
            <div>
              {conversationsLoading ? (
                <div className="rounded-2xl bg-background p-6 text-sm text-foreground/60">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <EmptyState
                  title="No chats yet"
                  text="Start messaging roommates or listing owners and your conversations will appear here."
                />
              ) : (
                <div className="grid gap-4">
                  {conversations.map((conversation) => (
                    <ChatCard
                      key={conversation.id}
                      conversation={conversation}
                      roommate={getConversationRoommate(conversation, conversationProfiles, user?.uid)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "saved" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Saved Rooms">
                {listingsLoading ? (
                  <div className="text-sm text-foreground/60">Loading saved rooms...</div>
                ) : favoriteListings.length === 0 ? (
                  <EmptyState
                    title="No saved rooms"
                    text="Tap the heart on a listing to save it for later."
                    compact
                  />
                ) : (
                  <div className="grid gap-4">
                    {favoriteListings.map((listing) => (
                      <MiniListingCard
                        key={listing.id}
                        title={listing.title}
                        subtitle={`${listing.city}${listing.district ? `, ${listing.district}` : ""}`}
                        price={formatListingPrice(
                          listing.monthlyRent,
                          listing.depositRequired,
                          listing.depositAmount
                        )}
                        href={`/rooms/${listing.id}`}
                        onRemove={() => void toggleFavorite(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Saved Roommates">
                {favoriteRoommateIds.length === 0 ? (
                  <EmptyState
                    title="No saved roommates"
                    text="Tap the heart on roommate cards to build your shortlist."
                    compact
                  />
                ) : (
                  <div className="grid gap-4">
                    {savedRoommates.map((roommate) => (
                      <MiniProfileCard
                        key={roommate.uid}
                        profile={roommate}
                        href={`/roommates/${roommate.uid}`}
                        onRemove={() => void toggleFavoriteRoommate(roommate.uid)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div>
              {historyListings.length === 0 ? (
                <EmptyState
                  title="No listing history yet"
                  text="Viewed and contacted listings will show up here automatically."
                />
              ) : (
                <div className="grid gap-4">
                  {historyListings.map(({ listing, contacted }) => (
                    <div
                      key={listing.id}
                      className="flex flex-col gap-4 rounded-[1.5rem] border border-[#eadfce] bg-[#fffdf9] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{listing.title}</h3>
                          <StatusBadge label={contacted ? "Contacted" : "Viewed"} active={contacted} />
                        </div>
                        <p className="mt-1 text-sm text-foreground/60">
                          {listing.city}
                          {listing.district ? `, ${listing.district}` : ""}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-primary">
                          {formatListingPrice(
                            listing.monthlyRent,
                            listing.depositRequired,
                            listing.depositAmount
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/rooms/${listing.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
                      >
                        View Listing
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-[#eadfce] bg-[#fffdf9] p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusBadge({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active ? "bg-primary/10 text-primary" : "bg-background text-foreground/65"
      }`}
    >
      {label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="text-xs font-semibold uppercase text-foreground/50">{label}</div>
      <div className="mt-1 font-semibold capitalize">{value}</div>
    </div>
  );
}

function EmptyState({
  title,
  text,
  compact = false
}: {
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-background text-center ${compact ? "p-5" : "p-8"}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-foreground/60">{text}</p>
    </div>
  );
}

function ChatCard({
  conversation,
  roommate
}: {
  conversation: Conversation;
  roommate: UserProfile | null;
}) {
  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className="flex flex-col gap-4 rounded-[1.5rem] border border-[#eadfce] bg-[#fffdf9] p-5 transition hover:-translate-y-0.5 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-background">
          {roommate?.photoURL ? (
            <Image src={roommate.photoURL} alt={roommate.fullName} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="grid h-full place-items-center text-lg font-bold text-primary">
              {(roommate?.fullName ?? "R").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold">{roommate?.fullName ?? "Conversation"}</h3>
            <StatusBadge label={conversation.listingTitle ?? "Roommate chat"} active />
          </div>
          <p className="mt-1 text-sm text-foreground/60 line-clamp-1">
            {conversation.lastMessage || "No messages yet"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-foreground/55">
        <span>{formatDate(conversation.updatedAt)}</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 font-medium text-foreground/70">
          <MessageCircle className="h-4 w-4 text-primary" />
          Open chat
        </span>
      </div>
    </Link>
  );
}

function MiniListingCard({
  title,
  subtitle,
  price,
  href,
  onRemove
}: {
  title: string;
  subtitle: string;
  price: string;
  href: string;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffdf9] p-4">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-foreground/60">{subtitle}</p>
      <p className="mt-3 text-sm font-semibold text-primary">{price}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          View Listing
        </Link>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-[#e2d5c5] px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function MiniProfileCard({
  profile,
  href,
  onRemove
}: {
  profile: UserProfile;
  href: string;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffdf9] p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-background">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="48px" />
          ) : null}
        </div>
        <div>
          <h3 className="font-bold">{profile.fullName}</h3>
          <p className="text-sm text-foreground/60">
            {profile.university} · {profile.occupation}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          View Profile
        </Link>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-[#e2d5c5] px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function getConversationRoommate(
  conversation: Conversation,
  profiles: Record<string, UserProfile | null>,
  currentUserId?: string
) {
  const otherId = conversation.participantIds.find((participantId) => participantId !== currentUserId);
  return otherId ? profiles[otherId] ?? null : null;
}

function getHistoryListings(
  listings: ReturnType<typeof useListings>["listings"],
  viewedListingIds?: string[],
  contactedListingIds?: string[]
) {
  const orderedIds = [...new Set([...(contactedListingIds ?? []), ...(viewedListingIds ?? [])])];

  return orderedIds
    .map((id) => {
      const listing = listings.find((item) => item.id === id);
      if (!listing) return null;
      return {
        listing,
        contacted: Boolean(contactedListingIds?.includes(id))
      };
    })
    .filter((item): item is { listing: (typeof listings)[number]; contacted: boolean } => Boolean(item));
}
