import { beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";

import { collection, isTimestampLike } from "@/index";
import { allKits } from "./emulator";
import { sampleUser, users } from "./support";

for (const kit of allKits) {
  describe(kit.name, () => {
    describe("reads and writes", () => {
      beforeEach(() => kit.clear());

      it("round-trips a document with its id merged in", async () => {
        const col = kit.db.collection(users);
        await col.set("john", sampleUser());
        const john = await col.get("john");
        expect(john!.id).toBe("john");
        expect(john!.name).toBe("John Doe");
      });

      it("coerces dates at any depth, Date on read, timestamp in storage", async () => {
        const events = collection(
          "events",
          z.object({ at: z.date(), meta: z.object({ start: z.date() }) }),
        );
        const col = kit.db.collection(events);
        const date = new Date("2020-01-01T00:00:00.000Z");
        await col.set("e1", { at: date, meta: { start: date } });

        const e = await col.get("e1");
        expect(e!.at).toBeInstanceOf(Date);
        expect(e!.at.getTime()).toBe(date.getTime());
        expect(e!.meta.start).toBeInstanceOf(Date);

        const stored = (await kit.rawGet("events/e1"))! as {
          at: unknown;
          meta: { start: unknown };
        };
        expect(isTimestampLike(stored.at)).toBe(true);
        expect(isTimestampLike(stored.meta.start)).toBe(true);
      });

      it("reports existence and returns null for a missing document", async () => {
        const col = kit.db.collection(users);
        await col.set("john", sampleUser());
        expect(await col.doc("john").exists()).toBe(true);
        expect(await col.doc("nope").exists()).toBe(false);
        expect(await col.get("nope")).toBeNull();
      });

      it("add generates an id", async () => {
        const col = kit.db.collection(users);
        const id = await col.add(sampleUser());
        expect(typeof id).toBe("string");
        expect((await col.get(id))!.name).toBe("John Doe");
      });

      it("delete removes the document", async () => {
        const col = kit.db.collection(users);
        await col.set("john", sampleUser());
        await col.delete("john");
        expect(await col.get("john")).toBeNull();
      });
    });
  });
}
