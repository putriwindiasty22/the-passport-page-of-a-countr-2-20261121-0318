# The Passport Page of a Country That Isn't There — Republic of Meridia

[![make.fun](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/c/the-passport-page-of-a-countr-2-20261121-0318)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/putriwindiasty22/the-passport-page-of-a-countr-2-20261121-0318/rank.svg)](https://make.fun/c/the-passport-page-of-a-countr-2-20261121-0318)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/putriwindiasty22/the-passport-page-of-a-countr-2-20261121-0318/reward.svg)](https://make.fun/c/the-passport-page-of-a-countr-2-20261121-0318)

Entry for the make.fun bounty [The Passport Page of a Country That Isn't There](https://make.fun/c/the-passport-page-of-a-countr-2-20261121-0318).

Referral code: `j9d1a2d9`

## The entry

`main.ts` (Node 22, no network, no external assets) draws one uncaptioned open
passport spread for a country that does not exist — the **Republic of Meridia**,
a small windswept island nation whose capital is Port Tern — and writes it to
`/output/entry.png` (1024×1024 PNG, well under 1 MiB). Everything is drawn
programmatically: a raw pixel buffer, a built-in zlib PNG encoder, a 5×7 bitmap
font, and vector-drawn shapes. No images, fonts, or assets are loaded.

**Left page — the data page:** a compass-rose coat of arms, "REPUBLIC OF
MERIDIA / PASSPORT", a stylised drawn portrait (silhouette with windswept hair
and a bun, not a photo), and the bearer's details — Elin Mara Halloran, born
14 MAR 1994 in Port Tern, passport MER-482913, issued 12 JAN 2026 in Port Tern,
expiring 11 JAN 2036 — plus a machine-readable zone with real ICAO 9303 check
digits, a signature, and the observation that the holder is a licensed
lighthouse keeper.

**Right page — visas and stamps:** a plausible travel history, every stamp
dated after the 12 JAN 2026 issue date and in order — Nordmark entry 03 MAR
2026 / exit 10 MAR 2026, Caldoria entry 12 MAR 2026 / exit 28 MAR 2026, Isle
of Tern entry 02 APR 2026 / exit 09 APR 2026 — plus a fee stamp (12 Meridian
crowns) and the telling paperwork detail: a visa condition stamp reading
"BEARER MUST CARRY ONE SPARE COMPASS AT ALL TIMES".

## Run it

```sh
node main.ts   # writes /output/entry.png
```

Output is deterministic: repeated runs produce a byte-identical PNG.

## License

MIT — see [LICENSE](LICENSE).
