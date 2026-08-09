import { describe, expect, it } from "vitest";

import { isOwnedUploadPath } from "@/app/api/upload/route";

/**
 * DELETE /api/upload takes the storage key from the request body and then calls
 * remove() with the SERVICE-ROLE client, which bypasses storage RLS entirely.
 * This predicate is the only thing between a caller and that removal.
 *
 * It replaced a check that accepted any path merely CONTAINING `/${uid}/`.
 */
const ME = "11111111-1111-1111-1111-111111111111";
const VICTIM = "22222222-2222-2222-2222-222222222222";

describe("isOwnedUploadPath", () => {
  it("accepts the three shapes POST can actually create", () => {
    expect(isOwnedUploadPath(`avatars/${ME}/a.jpg`, ME)).toBe(true);
    expect(isOwnedUploadPath(`listings/${ME}/a.png`, ME)).toBe(true);
    expect(isOwnedUploadPath(`messages/${ME}/a.webp`, ME)).toBe(true);
  });

  it("refuses another user's object", () => {
    expect(isOwnedUploadPath(`listings/${VICTIM}/a.jpg`, ME)).toBe(false);
    expect(isOwnedUploadPath(`avatars/${VICTIM}/a.jpg`, ME)).toBe(false);
  });

  it("refuses traversal that the old substring check let through", () => {
    // Contains `/${ME}/`, so the previous `path.includes()` test passed it. A
    // storage backend that normalises `..` would land on the victim's object.
    expect(isOwnedUploadPath(`listings/${ME}/../${VICTIM}/a.jpg`, ME)).toBe(false);
    expect(isOwnedUploadPath(`listings/${ME}/../../admin/a.jpg`, ME)).toBe(false);
  });

  it("refuses a uid segment buried mid-path", () => {
    // Also accepted by the old check.
    expect(isOwnedUploadPath(`listings/${VICTIM}/x/${ME}/a.jpg`, ME)).toBe(false);
  });

  it("refuses admin-owned assets", () => {
    // admin/ keys carry no uid segment and belong to no ordinary user.
    expect(isOwnedUploadPath("admin/a.jpg", ME)).toBe(false);
    expect(isOwnedUploadPath(`admin/${ME}/a.jpg`, ME)).toBe(false);
  });

  it("refuses backslashes, absolute paths and an empty user id", () => {
    expect(isOwnedUploadPath(`listings\\${ME}\\a.jpg`, ME)).toBe(false);
    expect(isOwnedUploadPath(`/listings/${ME}/a.jpg`, ME)).toBe(false);
    expect(isOwnedUploadPath("listings//a.jpg", "")).toBe(false);
  });

  it("refuses a uid that is only a prefix of another uid", () => {
    // `${ME}extra` must not satisfy a check for `${ME}`.
    expect(isOwnedUploadPath(`listings/${ME}extra/a.jpg`, ME)).toBe(false);
  });
});
