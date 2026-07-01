import { beforeEach, describe, expect, it } from "bun:test";

import { allKits } from "./emulator";
import { seedUsers, users } from "./support";

for (const kit of allKits) {
  describe(kit.name, () => {
    describe("cursors", () => {
      beforeEach(async () => {
        await kit.clear();
        await seedUsers(kit);
      });

      it("bounds inclusively with startAt/endAt, exclusively with startAfter/endBefore", async () => {
        const byAge = kit.db.collection(users).orderBy("age");
        const startAt = await byAge.startAt(30).get();
        expect(startAt.map((u) => u.name)).toEqual(["B", "C"]);
        const startAfter = await byAge.startAfter(30).get();
        expect(startAfter.map((u) => u.name)).toEqual(["C"]);
        const endAt = await byAge.endAt(30).get();
        expect(endAt.map((u) => u.name)).toEqual(["A", "B"]);
        const endBefore = await byAge.endBefore(30).get();
        expect(endBefore.map((u) => u.name)).toEqual(["A"]);
      });

      it("paginates with startAfter from a fetched value", async () => {
        const byAge = kit.db.collection(users).orderBy("age");
        const first = await byAge.limit(1).get();
        expect(first.map((u) => u.name)).toEqual(["A"]);
        const next = await byAge.startAfter(first[0]!.age).limit(1).get();
        expect(next.map((u) => u.name)).toEqual(["B"]);
      });

      it("bounds by a Date cursor", async () => {
        // Seeded users share the sample date, so an earlier bound is empty
        const byDate = kit.db.collection(users).orderBy("createdAt");
        expect((await byDate.get()).length).toBe(3);
        const earlier = new Date("2019-01-01T00:00:00.000Z");
        expect(await byDate.endBefore(earlier).get()).toEqual([]);
      });

      it("rejects a cursor without an orderBy", async () => {
        await expect(
          kit.db.collection(users).query().startAt(20).get(),
        ).rejects.toThrow();
      });
    });
  });
}
