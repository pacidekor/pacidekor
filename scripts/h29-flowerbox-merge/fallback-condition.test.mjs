import test from "node:test";
import assert from "node:assert/strict";
import { isArchiveSchemaMissing } from "../../src/lib/product-archive-schema.ts";

test("fallback only on confirmed missing archive columns", () => {
  assert.equal(isArchiveSchemaMissing("column products.archived_at does not exist"), true);
  assert.equal(isArchiveSchemaMissing("Could not find the 'archived_at' column of 'products' in the schema cache"), true);
  assert.equal(isArchiveSchemaMissing("canceling statement due to statement timeout"), false);
  assert.equal(isArchiveSchemaMissing("permission denied for table products"), false);
  assert.equal(isArchiveSchemaMissing("JWT expired"), false);
  assert.equal(isArchiveSchemaMissing("fetch failed"), false);
  assert.equal(isArchiveSchemaMissing("something archived_at related but ok"), false);
});
