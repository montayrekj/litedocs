import { describe, it, expect } from "vitest";
import {
  canReadDocument,
  canEditDocument,
  canDeleteDocument,
  canShareDocument,
} from "@/lib/documents/access";

const OWNER_ID = "user-alice";
const EDITOR_ID = "user-bob";
const STRANGER_ID = "user-charlie";
const DOC_ID = "doc-001";

const noShares: never[] = [];
const withBobAsEditor = [
  { document_id: DOC_ID, shared_with_user_id: EDITOR_ID, role: "editor" as const },
];

describe("canReadDocument", () => {
  it("allows the owner to read their own document", () => {
    expect(canReadDocument({ userId: OWNER_ID, ownerId: OWNER_ID, shares: noShares })).toBe(true);
  });

  it("allows a shared editor to read the document", () => {
    expect(canReadDocument({ userId: EDITOR_ID, ownerId: OWNER_ID, shares: withBobAsEditor })).toBe(true);
  });

  it("denies a stranger with no share row", () => {
    expect(canReadDocument({ userId: STRANGER_ID, ownerId: OWNER_ID, shares: withBobAsEditor })).toBe(false);
  });

  it("denies a stranger when there are no shares at all", () => {
    expect(canReadDocument({ userId: STRANGER_ID, ownerId: OWNER_ID, shares: noShares })).toBe(false);
  });
});

describe("canEditDocument", () => {
  it("allows the owner to edit their own document", () => {
    expect(canEditDocument({ userId: OWNER_ID, ownerId: OWNER_ID, shares: noShares })).toBe(true);
  });

  it("allows a shared editor to edit the document", () => {
    expect(canEditDocument({ userId: EDITOR_ID, ownerId: OWNER_ID, shares: withBobAsEditor })).toBe(true);
  });

  it("denies a user in the share list with wrong role", () => {
    const sharesWithViewerOnly = [
      { document_id: DOC_ID, shared_with_user_id: EDITOR_ID, role: "viewer" as "editor" },
    ];
    expect(canEditDocument({ userId: EDITOR_ID, ownerId: OWNER_ID, shares: sharesWithViewerOnly })).toBe(false);
  });

  it("denies a stranger", () => {
    expect(canEditDocument({ userId: STRANGER_ID, ownerId: OWNER_ID, shares: withBobAsEditor })).toBe(false);
  });
});

describe("canDeleteDocument", () => {
  it("allows the owner to delete their document", () => {
    expect(canDeleteDocument({ userId: OWNER_ID, ownerId: OWNER_ID })).toBe(true);
  });

  it("denies a shared editor from deleting", () => {
    expect(canDeleteDocument({ userId: EDITOR_ID, ownerId: OWNER_ID })).toBe(false);
  });

  it("denies a stranger from deleting", () => {
    expect(canDeleteDocument({ userId: STRANGER_ID, ownerId: OWNER_ID })).toBe(false);
  });
});

describe("canShareDocument", () => {
  it("allows the owner to share their document", () => {
    expect(canShareDocument({ userId: OWNER_ID, ownerId: OWNER_ID })).toBe(true);
  });

  it("denies a shared editor from re-sharing", () => {
    expect(canShareDocument({ userId: EDITOR_ID, ownerId: OWNER_ID })).toBe(false);
  });
});
