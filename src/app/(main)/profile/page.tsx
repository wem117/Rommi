"use client";

import { Loader2, MessageCircle, Pencil, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ContactLinks } from "@/components/shared/contact-links";
import { VerifiedBadge } from "@/components/shared/trust-signals";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useConversations } from "@/hooks/use-conversations";
import { AccountMenu } from "@/components/profile/account-menu";
import { useFavorites } from "@/hooks/use-favorites";
import { useListings } from "@/hooks/use-listings";
import { getProfileById, updateProfile } from "@/lib/data/profiles";
import { formatCurrency, formatDate, formatListingPrice } from "@/lib/utils/format";
import { profileCompletion } from "@/lib/utils/compatibility";
import type { Conversation } from "@/types/chat";
import type { UserProfile } from "@/types/user";

const tabs = [
  { id: "overview", key: "profile.overview" },
  { id: "chats", key: "profile.chats" },
  { id: "saved", key: "profile.savedListings" },
  { id: "history", key: "profile.history" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, locale } = useLocale();
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
  const [visibilitySaving, setVisibilitySaving] = useState(false);

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

      const participantIds = [
        ...new Set(
          conversations
            .flatMap((conversation) => conversation.participantIds)
            .filter((participantId) => participantId !== user.uid)
        )
      ];

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

  async function toggleVisibility() {
    if (!user || !profile) return;
    setVisibilitySaving(true);

    try {
      await updateProfile({
        uid: user.uid,
        lookingForApartment: !profile.lookingForApartment
      });
      await refreshProfile();
      toast.success(
        profile.lookingForApartment ? t("profile.searchVisibilityOff") : t("profile.searchVisibilityOn")
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not update roommate visibility");
    } finally {
      setVisibilitySaving(false);
    }
  }

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
                <h1 className="text-2xl font-bold sm:text-3xl">{profile.fullName}</h1>
                {/* "Verified" is an admin-granted trust mark; email confirmation alone must not show it. */}
                <VerifiedBadge verified={profile.verified} />
              </div>
              <p className="mt-2 max-w-2xl text-foreground/65">{profile.bio || t("profile.noBio")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={profile.university} />
                <StatusBadge label={profile.occupation} />
                <StatusBadge label={`${profile.age} ${t("roommateDetail.yearsOld")}`} />
                <StatusBadge
                  label={profile.lookingForApartment ? t("profile.visible") : t("profile.hidden")}
                  active={profile.lookingForApartment}
                />
              </div>
              {profile.telegram || profile.phone ? (
                <div className="mt-4">
                  <ContactLinks telegram={profile.telegram} phone={profile.phone} size="sm" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/profile/edit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <Pencil className="h-4 w-4" />
              {t("profile.editProfile")}
            </Link>
            <div className="rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {completion}% {t("profile.complete")}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e2d6c8]">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everything that belongs to this account, including My listings —
          which used to sit in the top navigation bar beside the public browse
          pages. */}
      <div className="mt-6">
        <AccountMenu />
      </div>

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
              {t(tab.key)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Panel title={t("profile.housingPreferences")}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Info
                    label={t("profile.budget")}
                    value={`${formatCurrency(profile.minBudget)} - ${formatCurrency(profile.maxBudget)}`}
                  />
                  <Info label={t("profile.moveIn")} value={formatDate(profile.preferredMoveInDate, locale)} />
                  <Info
                    label={t("profile.gender")}
                    value={
                      {
                        male: t("listingForm.male"),
                        female: t("listingForm.female"),
                        other: t("roommates.other"),
                        prefer_not_to_say: t("roommates.preferNotToSay")
                      }[profile.gender] ?? profile.gender.replaceAll("_", " ")
                    }
                  />
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-[#e8dccd] bg-[#f8f2e8] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{t("profile.searchVisibility")}</h3>
                      <p className="mt-1 text-sm leading-6 text-foreground/60">
                        {t("profile.searchVisibilityDescription")}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${profile.lookingForApartment ? "bg-primary" : "bg-foreground/30"}`}
                        />
                        {profile.lookingForApartment ? t("profile.searchVisibilityOn") : t("profile.searchVisibilityOff")}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      {visibilitySaving ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                      <Switch
                        checked={profile.lookingForApartment}
                        disabled={visibilitySaving}
                        onCheckedChange={() => void toggleVisibility()}
                        aria-label={t("profile.searchVisibility")}
                      />
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title={t("profile.lifestylePreferences")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info
                    label={t("onboarding.cleanlinessLabel")}
                    value={t(
                      profile.lifestyle.cleanliness === "very_clean"
                        ? "onboarding.cleanlinessVeryClean"
                        : profile.lifestyle.cleanliness === "moderate"
                          ? "onboarding.cleanlinessModerate"
                          : "onboarding.cleanlinessRelaxed"
                    )}
                  />
                  <Info
                    label={t("onboarding.sleepScheduleLabel")}
                    value={t(
                      profile.lifestyle.sleepSchedule === "early_bird"
                        ? "onboarding.sleepEarlyBird"
                        : profile.lifestyle.sleepSchedule === "night_owl"
                          ? "onboarding.sleepNightOwl"
                          : "onboarding.sleepBalanced"
                    )}
                  />
                  <Info
                    label={t("onboarding.guestsLabel")}
                    value={t(
                      profile.lifestyle.guests === "rarely"
                        ? "onboarding.guestsRarely"
                        : profile.lifestyle.guests === "often"
                          ? "onboarding.guestsOften"
                          : "onboarding.guestsSometimes"
                    )}
                  />
                  <Info
                    label={t("onboarding.smokingLabel")}
                    value={profile.lifestyle.smoking ? t("listingForm.yes") : t("listingForm.no")}
                  />
                  <Info
                    label={t("onboarding.petsLabel")}
                    value={profile.lifestyle.pets ? t("listingForm.yes") : t("listingForm.no")}
                  />
                </div>
              </Panel>
            </div>
          ) : null}

          {activeTab === "chats" ? (
            <div>
              {conversationsLoading ? (
                <div className="rounded-2xl bg-background p-6 text-sm text-foreground/60">{t("chat.loadingConversations")}</div>
              ) : conversations.length === 0 ? (
                <EmptyState title={t("profile.emptyChatsTitle")} text={t("profile.emptyChatsText")} />
              ) : (
                <div className="grid gap-4">
                  {conversations.map((conversation) => (
                    <ChatCard
                      key={conversation.id}
                      conversation={conversation}
                      roommate={getConversationRoommate(conversation, conversationProfiles, user?.uid)}
                      openChatLabel={t("profile.openChat")}
                      noMessagesLabel={t("profile.noMessages")}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "saved" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title={t("profile.savedRooms")}>
                {listingsLoading ? (
                  <div className="text-sm text-foreground/60">Loading saved rooms...</div>
                ) : favoriteListings.length === 0 ? (
                  <EmptyState title={t("profile.emptyRoomsTitle")} text={t("profile.emptyRoomsText")} compact />
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
                        viewLabel={t("profile.viewListing")}
                        removeLabel={t("profile.remove")}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title={t("profile.savedRoommates")}>
                {favoriteRoommateIds.length === 0 ? (
                  <EmptyState
                    title={t("profile.emptyRoommatesTitle")}
                    text={t("profile.emptyRoommatesText")}
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
                        viewLabel={t("profile.viewProfile")}
                        removeLabel={t("profile.remove")}
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
                <EmptyState title={t("profile.emptyHistoryTitle")} text={t("profile.emptyHistoryText")} />
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
                          <StatusBadge label={contacted ? t("profile.contacted") : t("profile.viewed")} active={contacted} />
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
                        {t("profile.viewListing")}
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
  roommate,
  openChatLabel,
  noMessagesLabel
}: {
  conversation: Conversation;
  roommate: UserProfile | null;
  openChatLabel: string;
  noMessagesLabel: string;
}) {
  const { locale } = useLocale();

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
          <p className="mt-1 line-clamp-1 text-sm text-foreground/60">
            {conversation.lastMessage || noMessagesLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-foreground/55">
        <span>{formatDate(conversation.updatedAt, locale)}</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 font-medium text-foreground/70">
          <MessageCircle className="h-4 w-4 text-primary" />
          {openChatLabel}
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
  onRemove,
  viewLabel,
  removeLabel
}: {
  title: string;
  subtitle: string;
  price: string;
  href: string;
  onRemove: () => void;
  viewLabel: string;
  removeLabel: string;
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
          {viewLabel}
        </Link>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-[#e2d5c5] px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          {removeLabel}
        </button>
      </div>
    </div>
  );
}

function MiniProfileCard({
  profile,
  href,
  onRemove,
  viewLabel,
  removeLabel
}: {
  profile: UserProfile;
  href: string;
  onRemove: () => void;
  viewLabel: string;
  removeLabel: string;
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
          {viewLabel}
        </Link>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full border border-[#e2d5c5] px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          {removeLabel}
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

