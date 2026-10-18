/**
 * Shared validation: captured post-state vs approved-manifest + backup-pre identities.
 * No manifest fallback for missing fields — missing required data → reject.
 */

export function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canon(v[k])]),
    );
  }
  return v;
}

export function same(a, b) {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

/**
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validatePostAgainstApproved(post, pre, approved) {
  const errors = [];
  const req = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  req(post && typeof post === "object", "post missing");
  req(pre?.target && pre?.source082 && pre?.source071, "backup-pre incomplete");
  req(approved?.target && approved?.images, "approved-manifest incomplete");
  if (errors.length) return { ok: false, errors };

  const t = post.target;
  const s082 = post.source082;
  const s071 = post.source071;

  req(t, "post.target missing");
  req(s082, "post.source082 missing");
  req(s071, "post.source071 missing");
  if (errors.length) return { ok: false, errors };

  // Identities of all three products
  req(t.id === pre.target.id && t.id === approved.target.productId, "target id mismatch");
  req(t.sku === pre.target.sku && t.sku === approved.target.sku, "target sku mismatch");
  req(t.slug === pre.target.slug && t.slug === approved.target.slug, "target slug mismatch");
  req(s082.id === pre.source082.id && s082.id === approved.sources[0].productId, "082 id mismatch");
  req(s082.sku === pre.source082.sku && s082.sku === approved.sources[0].sku, "082 sku mismatch");
  req(s071.id === pre.source071.id && s071.id === approved.sources[1].productId, "071 id mismatch");
  req(s071.sku === pre.source071.sku && s071.sku === approved.sources[1].sku, "071 sku mismatch");

  // Target approved post shape — required fields, no fallback
  req(typeof t.name === "string" && t.name === approved.target.name, "target name mismatch or missing");
  req(Array.isArray(t.color_ids), "target color_ids missing");
  req(same(t.color_ids, approved.colorIds), "target color_ids mismatch");
  req(t.color_image_map != null && typeof t.color_image_map === "object", "target color_image_map missing");
  req(same(t.color_image_map, approved.colorImageMap), "target color_image_map mismatch");
  req(Array.isArray(t.images), "target images missing");
  req(same(t.images, approved.images), "target images order/content mismatch");
  req(t.shared_image_urls != null, "target shared_image_urls missing");
  req(same(t.shared_image_urls, approved.sharedImageUrls), "target shared_image_urls mismatch");
  req(
    Array.isArray(t.unavailable_color_ids) &&
      same(t.unavailable_color_ids, approved.unavailableColorIds ?? []),
    "target unavailable_color_ids mismatch or missing",
  );
  req(t.archived_at == null, "target must not be archived");
  req(t.redirect_to_product_id == null, "target must not redirect");
  req(typeof t.updated_at === "string" && t.updated_at.length > 0, "target updated_at missing");

  // Sources: archived + redirect to target; images unchanged from pre
  for (const [label, s, preS] of [
    ["082", s082, pre.source082],
    ["071", s071, pre.source071],
  ]) {
    req(s.archived_at != null, `source ${label} archived_at missing`);
    req(
      s.redirect_to_product_id === pre.target.id,
      `source ${label} redirect_to_product_id mismatch`,
    );
    req(Array.isArray(s.images), `source ${label} images missing`);
    req(same(s.images, preS.images), `source ${label} images must match backup-pre`);
    req(typeof s.updated_at === "string" && s.updated_at.length > 0, `source ${label} updated_at missing`);
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
