import { beforeEach, describe, expect, it } from "bun:test";
import { getDoc as webGetDoc, setDoc as webSetDoc } from "firebase/firestore";

import { docRef as adminDocRef } from "@/admin";
import { docRef as webDocRef } from "@/web";
import { adminKit, webKit } from "./emulator";
import { sampleUser, users } from "./support";

// Escape hatches are per entrypoint, so each driver exercises its own SDK calls
describe("admin", () => {
  describe("refs", () => {
    beforeEach(() => adminKit.clear());

    it("coerces through the ref converter and never stores id", async () => {
      const ref = adminDocRef(adminKit.db.collection(users).doc("john"));
      await ref.set({ ...sampleUser(), id: "john" });
      const stored = (await adminKit.rawGet("users/john"))!;
      expect("id" in stored).toBe(false);
      expect(adminKit.isSdkTimestamp(stored.createdAt)).toBe(true);
      const doc = (await ref.get()).data()!;
      expect(doc.id).toBe("john");
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.name).toBe("John Doe");
    });
  });
});

describe("web", () => {
  describe("refs", () => {
    beforeEach(() => webKit.clear());

    it("coerces through the ref converter and never stores id", async () => {
      const ref = webDocRef(webKit.db.collection(users).doc("john"));
      await webSetDoc(ref, { ...sampleUser(), id: "john" });
      const stored = (await webKit.rawGet("users/john"))!;
      expect("id" in stored).toBe(false);
      expect(webKit.isSdkTimestamp(stored.createdAt)).toBe(true);
      const doc = (await webGetDoc(ref)).data()!;
      expect(doc.id).toBe("john");
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.name).toBe("John Doe");
    });
  });
});
