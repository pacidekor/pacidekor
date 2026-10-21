/**
 * Print DNS cutover steps for pacidekor.sk (Websupport → Cloudflare).
 * Zone already created in CF; mail/TXT records imported. You flip NS.
 */
console.log(`
=== DNS cutover: pacidekor.sk ===

1) Websupport → DNS / nameservery domény
   Nahraď NS za Cloudflare:
     mitch.ns.cloudflare.com
     piper.ns.cloudflare.com

2) Počkej až zone status = active (CF dashboard → pacidekor.sk)

3) Pak spusť:
     npm run cf:attach-domains
     npm run cf:setup-r2          # až bude R2 Enable + karta

4) Rollback = vrať NS na Websupport
     ns1.websupport.sk / ns2 / ns3
   Vercel projekt zatím nemaž — zůstává fallback.

Zóna ID: 6b3a410cb0f8d69fd19398f0083f4ba3
Worker:  pacidekor
`);
