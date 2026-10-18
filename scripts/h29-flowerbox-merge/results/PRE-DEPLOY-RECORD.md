# H29 pre-deploy record (2026-10-18)

## Previous production deployment
- **GitHub `master` tip before H29:** `d8cf59315d3fefa152882bca43a7a10faadec665`
- **Message:** Add per-color sold-out availability (unavailable_color_ids) for H07.
- **Live site:** https://www.pacidekor.sk/ (Vercel; confirmed HTTP 200)
- **Rollback code:** `git revert` / redeploy `d8cf593` (keeps H07)

## Production schema (pre-migration)
- `unavailable_color_ids` — present (H07)
- `shared_image_urls`, `color_image_map` — present
- `archived_at`, `redirect_to_product_id` — **absent** (H29 migration not applied)

## Three products (live SQL, matches expected-pre.json)
| SKU | slug | images_n | colors | updated_at |
| --- | --- | --- | --- | --- |
| IMP-NEJ-083 | okruhly-flowerbox-so-snurkou-mix-farieb | 10 | 3 | 2026-10-16 12:31:47.416479+00 |
| IMP-NEJ-082 | sada-2-okruhlych-flowerboxov-kraft-so-snurkou | 4 | hneda | 2026-09-26 14:34:01.090115+00 |
| IMP-NEJ-071 | sada-okruhlych-flowerboxov-so-snurkou-kremova | 2 | kremova | 2026-10-16 16:35:11.959842+00 |

All: price `5,90 €`, in_stock true, packaging krabica×2, unavailable_color_ids [].
