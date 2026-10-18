/**
 * Immutable activation artifacts + revert generator validation.
 * Run: node --test scripts/h29-flowerbox-merge/activation-artifacts.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validatePostAgainstApproved } from "./h29-post-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const approved = JSON.parse(
  readFileSync(join(__dirname, "approved-manifest.json"), "utf8"),
);
const pre = JSON.parse(readFileSync(join(__dirname, "backup-pre.json"), "utf8"));

function goodPost() {
  return {
    capturedInTransaction: true,
    target: {
      id: pre.target.id,
      sku: pre.target.sku,
      slug: pre.target.slug,
      name: approved.target.name,
      price: pre.target.price,
      packaging: pre.target.packaging,
      in_stock: true,
      stock_quantity: null,
      color_ids: [...approved.colorIds],
      color_image_map: { ...approved.colorImageMap },
      shared_image_urls: [...approved.sharedImageUrls],
      unavailable_color_ids: [],
      images: [...approved.images],
      updated_at: "2026-10-18 10:00:00.000000+00",
      archived_at: null,
      redirect_to_product_id: null,
    },
    source082: {
      id: pre.source082.id,
      sku: pre.source082.sku,
      slug: pre.source082.slug,
      name: pre.source082.name,
      images: [...pre.source082.images],
      updated_at: "2026-10-18 10:00:00.000000+00",
      archived_at: "2026-10-18 10:00:00.000000+00",
      redirect_to_product_id: pre.target.id,
    },
    source071: {
      id: pre.source071.id,
      sku: pre.source071.sku,
      slug: pre.source071.slug,
      name: pre.source071.name,
      images: [...pre.source071.images],
      updated_at: "2026-10-18 10:00:00.000000+00",
      archived_at: "2026-10-18 10:00:00.000000+00",
      redirect_to_product_id: pre.target.id,
    },
  };
}

test("validate: good post passes", () => {
  const r = validatePostAgainstApproved(goodPost(), pre, approved);
  assert.equal(r.ok, true);
});

test("validate: tampered map rejected", () => {
  const post = goodPost();
  post.target.color_image_map = {
    ...post.target.color_image_map,
    hneda: [10, 11, 12, 13],
  };
  const r = validatePostAgainstApproved(post, pre, approved);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /color_image_map/.test(e)));
});

test("validate: missing images rejected (no manifest fallback)", () => {
  const post = goodPost();
  delete post.target.images;
  const r = validatePostAgainstApproved(post, pre, approved);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /images missing/.test(e)));
});

test("generator: tampered map → refuse; good post → revert; rewrite refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "h29-act-"));
  try {
    copyFileSync(join(__dirname, "backup-pre.json"), join(dir, "backup-pre.json"));
    const badPost = goodPost();
    badPost.target.color_image_map.hneda = [99];
    writeFileSync(join(dir, "backup-post.json"), JSON.stringify(badPost), "utf8");

    const bad = spawnSync(
      process.execPath,
      [
        join(__dirname, "build-revert-from-backup.mjs"),
        "--activation-dir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr || "", /STOP|color_image_map|refuse/i);
    assert.equal(existsSync(join(dir, "revert-from-backup.sql")), false);

    // Replace with good post
    writeFileSync(join(dir, "backup-post.json"), JSON.stringify(goodPost()), "utf8");
    const good = spawnSync(
      process.execPath,
      [
        join(__dirname, "build-revert-from-backup.mjs"),
        "--activation-dir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.equal(good.status, 0, good.stderr);
    assert.equal(existsSync(join(dir, "revert-from-backup.sql")), true);
    const first = readFileSync(join(dir, "revert-from-backup.sql"), "utf8");

    // Second generate must refuse overwrite
    const again = spawnSync(
      process.execPath,
      [
        join(__dirname, "build-revert-from-backup.mjs"),
        "--activation-dir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(again.status, 0);
    assert.match(again.stderr || "", /refuse to overwrite/i);
    assert.equal(
      readFileSync(join(dir, "revert-from-backup.sql"), "utf8"),
      first,
      "original revert preserved",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("capture-post-state.mjs refuses late overwrite", () => {
  const r = spawnSync(
    process.execPath,
    [join(__dirname, "capture-post-state.mjs")],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr || "", /late DB capture is disabled|run-activate-capture/i);
});
