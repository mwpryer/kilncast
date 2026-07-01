import { beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";

import { collection, isTimestampLike } from "@/index";
import type { Timestamp } from "@/index";
import { allKits } from "./emulator";

for (const kit of allKits) {
  describe(kit.name, () => {
    describe("raw fields", () => {
      beforeEach(() => kit.clear());

      // 1700000000.123456s, 456us of sub-millisecond precision a Date would truncate
      const SECONDS = 1700000000;
      // Microsecond aligned, Firestore stores timestamps at microsecond precision
      const NANOS = 123456000;

      // Name the Timestamp structurally so the schema stays validator-agnostic and shareable
      const events = collection(
        "events",
        z.object({
          preciseAt: z.custom<Timestamp>(isTimestampLike),
          loggedAt: z.date(),
          meta: z.object({ ts: z.custom<Timestamp>(isTimestampLike) }),
          samples: z.array(z.custom<Timestamp>(isTimestampLike)),
        }),
        { raw: ["preciseAt", "meta.ts", "samples"] },
      );

      it("keeps listed paths raw while coercing unlisted siblings", async () => {
        const col = kit.db.collection(events);
        await col.set("e1", {
          preciseAt: kit.timestamp(SECONDS, NANOS),
          loggedAt: new Date("2020-01-01T00:00:00.000Z"),
          meta: { ts: kit.timestamp(SECONDS, NANOS) },
          samples: [
            kit.timestamp(SECONDS, NANOS),
            kit.timestamp(SECONDS + 1, 0),
          ],
        });

        // A listed leaf, a nested dot-joined path, and an array path each keep the real SDK Timestamp
        const e = await col.get("e1");
        expect(kit.isSdkTimestamp(e!.preciseAt)).toBe(true);
        expect(e!.preciseAt.seconds).toBe(SECONDS);
        expect(e!.preciseAt.nanoseconds).toBe(NANOS);
        expect(kit.isSdkTimestamp(e!.meta.ts)).toBe(true);
        expect(e!.meta.ts.nanoseconds).toBe(NANOS);
        expect(e!.samples).toHaveLength(2);
        expect(kit.isSdkTimestamp(e!.samples[0])).toBe(true);
        expect(e!.samples[0]!.nanoseconds).toBe(NANOS);
        expect(kit.isSdkTimestamp(e!.samples[1])).toBe(true);

        // A sibling unlisted field still coerces to a Date
        expect(e!.loggedAt).toBeInstanceOf(Date);
        expect(e!.loggedAt.getTime()).toBe(
          new Date("2020-01-01T00:00:00.000Z").getTime(),
        );

        // Both a Date field and a Timestamp field store as a native timestamp
        const stored = (await kit.rawGet("events/e1"))!;
        expect(isTimestampLike(stored.preciseAt)).toBe(true);
        expect(isTimestampLike(stored.loggedAt)).toBe(true);
      });

      it("keeps a listed parent map's whole subtree raw", async () => {
        const wrap = collection(
          "wrap",
          z.object({
            meta: z.object({ ts: z.custom<Timestamp>(isTimestampLike) }),
          }),
          { raw: ["meta"] },
        );
        const col = kit.db.collection(wrap);
        await col.set("w1", { meta: { ts: kit.timestamp(SECONDS, NANOS) } });
        const w = await col.get("w1");
        expect(kit.isSdkTimestamp(w!.meta.ts)).toBe(true);
        expect(w!.meta.ts.nanoseconds).toBe(NANOS);
      });
    });
  });
}
