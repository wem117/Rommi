import { randomUUID } from "node:crypto";

/**
 * Identifier for a hand-created host profile (a landlord the admin entered from
 * Telegram/WhatsApp/OLX rather than someone who signed up).
 *
 * It is a bare UUID on purpose. `profiles.uid` has no foreign key to
 * `auth.users`, so a standalone row is valid whatever the id looks like — but
 * the uid is part of the listing payload the browser receives and part of the
 * `/roommates/<uid>` URL, so a marker prefix would let any visitor read "admin"
 * off a seeded listing's host. That is exactly the distinction seeded listings
 * must not carry, so the id has to be shaped like every other account id.
 */
export function newSeededHostUid(): string {
  return randomUUID();
}
