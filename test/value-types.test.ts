import { beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";

import { collection } from "@/index";
import type { GeoPoint } from "@/index";
import { allKits } from "./emulator";

for (const kit of allKits) {
  describe(kit.name, () => {
    beforeEach(() => kit.clear());

    describe("neutral value types", () => {
      it("round-trips an SDK GeoPoint uncoerced", async () => {
        const spots = collection(
          "spots",
          z.object({ at: z.custom<GeoPoint>() }),
        );
        const col = kit.db.collection(spots);
        await col.set("p", { at: kit.geoPoint(51.5, -0.12) });
        const got = await col.get("p");
        expect(got!.at.latitude).toBeCloseTo(51.5);
        expect(got!.at.longitude).toBeCloseTo(-0.12);
        // The real SDK class survives, the boundary never walked it as a plain map
        expect(kit.isSdkGeoPoint(got!.at)).toBe(true);
      });
    });

    describe("bytes", () => {
      const files = collection(
        "files",
        z.object({ blob: z.custom<Uint8Array>() }),
      );

      it("round-trips a Uint8Array as a neutral Uint8Array", async () => {
        const col = kit.db.collection(files);
        await col.set("f", { blob: new Uint8Array([1, 2, 3, 255]) });
        // Stored as a real Firestore bytes value, not a map of indices
        expect(kit.isSdkBytes((await kit.rawGet("files/f"))!.blob)).toBe(true);
        // Read back as a plain Uint8Array, not the SDK bytes class or a Buffer
        const got = await col.get("f");
        expect(got!.blob).toBeInstanceOf(Uint8Array);
        expect(kit.isSdkBytes(got!.blob)).toBe(false);
        expect(Array.from(got!.blob)).toEqual([1, 2, 3, 255]);
      });

      it("passes a raw SDK bytes value through uncoerced", async () => {
        const col = kit.db.collection(files);
        await col.set("g", {
          blob: kit.bytes(new Uint8Array([9, 8, 7])) as Uint8Array,
        });
        expect(Array.from((await col.get("g"))!.blob)).toEqual([9, 8, 7]);
      });
    });
  });
}
