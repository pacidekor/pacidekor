/**
 * Targeted tests for shared-photo protection (no Storage deletes).
 * Run: node --experimental-strip-types --test scripts/h29-flowerbox-merge/product-image-refs.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  collectReferencedImageUrls,
  collectUrlsFromProductRows,
  storagePathsNotReferenced,
} from "../../src/lib/product-image-refs.ts";

const SHARED =
  "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/47ae6d17acfe-4.webp";
const ONLY_SOURCE =
  "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/only-here.webp";

test("read error → fail closed (caller must not delete)", async () => {
  const refs = await collectReferencedImageUrls(async () => ({
    data: null,
    error: { message: "connection reset" },
    total: null,
  }));
  assert.equal(refs.ok, false);
  assert.match(refs.error, /Mazanie zrušené/);
});

test("non-array page → fail closed", async () => {
  const refs = await collectReferencedImageUrls(async () => ({
    data: null,
    error: null,
    total: 0,
  }));
  assert.equal(refs.ok, false);
  assert.match(refs.error, /neúplná odpoveď|Mazanie zrušené/);
});

test("missing total on short page → refuse (server limit may have truncated)", async () => {
  const refs = await collectReferencedImageUrls(
    async () => ({
      data: [{ id: "a", images: ["x"], shared_image_urls: [] }],
      error: null,
      total: null,
    }),
    { pageSize: 10 },
  );
  assert.equal(refs.ok, false);
  assert.match(refs.error, /úplnost|celkový počet|Content-Range|Mazanie zrušené/i);
});

test("short page while total says more remain → refuse", async () => {
  const refs = await collectReferencedImageUrls(
    async () => ({
      data: [
        { id: "1", images: ["a"], shared_image_urls: [] },
        { id: "2", images: ["b"], shared_image_urls: [] },
      ],
      error: null,
      total: 50,
    }),
    { pageSize: 10 },
  );
  assert.equal(refs.ok, false);
  assert.match(refs.error, /zkrácena|serverový limit|Mazanie zrušené/i);
});

test("pagination with exact total → all URLs collected", async () => {
  const pages = [
    {
      data: [{ id: "1", images: ["a"], shared_image_urls: [] }],
      total: 3,
    },
    {
      data: [{ id: "2", images: ["b"], shared_image_urls: ["c"] }],
      total: 3,
    },
    {
      data: [{ id: "3", images: ["d"], shared_image_urls: null }],
      total: 3,
    },
  ];
  let call = 0;
  const refs = await collectReferencedImageUrls(
    async () => {
      const p = pages[call++];
      return { data: p.data, error: null, total: p.total };
    },
    { pageSize: 1 },
  );
  assert.equal(refs.ok, true);
  assert.deepEqual([...refs.urls].sort(), ["a", "b", "c", "d"]);
  assert.equal(call, 3);
});

test("empty catalog with total 0 → ok", async () => {
  const refs = await collectReferencedImageUrls(async () => ({
    data: [],
    error: null,
    total: 0,
  }));
  assert.equal(refs.ok, true);
  assert.equal(refs.urls.size, 0);
});

test("unsorted ids → refuse", async () => {
  const refs = await collectReferencedImageUrls(
    async () => ({
      data: [
        { id: "b", images: ["1"], shared_image_urls: [] },
        { id: "a", images: ["2"], shared_image_urls: [] },
      ],
      error: null,
      total: 2,
    }),
    { pageSize: 10 },
  );
  assert.equal(refs.ok, false);
  assert.match(refs.error, /řazení|Mazanie zrušené/i);
});

test("archived product rows still count as references", () => {
  const urls = collectUrlsFromProductRows([
    { images: [SHARED], shared_image_urls: [] },
  ]);
  assert.equal(urls.has(SHARED), true);
  const paths = storagePathsNotReferenced([SHARED, ONLY_SOURCE], urls);
  assert.deepEqual(paths, ["bulk-nej/82/only-here.webp"]);
  assert.equal(paths.includes("bulk-nej/83/47ae6d17acfe-4.webp"), false);
});

test("shared photo preserved when referenced elsewhere", async () => {
  const productImages = [SHARED, ONLY_SOURCE];
  const refs = await collectReferencedImageUrls(async () => ({
    data: [
      {
        id: "archived-target",
        images: [SHARED, "other.webp"],
        shared_image_urls: [SHARED],
      },
    ],
    error: null,
    total: 1,
  }));
  assert.equal(refs.ok, true);
  const deletedPaths = storagePathsNotReferenced(productImages, refs.urls);
  assert.deepEqual(deletedPaths, ["bulk-nej/82/only-here.webp"]);
  assert.equal(deletedPaths.some((p) => p.includes("47ae6d17acfe-4")), false);
});

test("on reference error: no DB delete and no Storage delete", async () => {
  let dbDeleted = false;
  let storageCalled = false;
  const refs = await collectReferencedImageUrls(async () => ({
    data: null,
    error: { message: "timeout" },
    total: null,
  }));
  if (!refs.ok) {
    assert.equal(dbDeleted, false);
    assert.equal(storageCalled, false);
    return;
  }
  dbDeleted = true;
  storageCalled = true;
  assert.fail("should have returned early");
});
