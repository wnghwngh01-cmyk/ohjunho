# Profile frames · 2026-10-10

Generated using the built-in GPT image generation tool. PNG originals are preserved. The app renders recolored frames to a cached canvas at runtime; profile photos are separate and never recolored.

Selected assets:
- `assets/profile-frames/ribbon-v2.png`: 5,000 won, ribbon with compact bottom knot. Original generation `exec-e8e366d7-60fe-4405-af44-eb134218608c.png`.
- `assets/profile-frames/blossom-v2.png`: 10,000 won, dense upper-right/lower-left floral clusters. User approved the displayed `exec-0135c9f2-f96d-44fc-b1d7-989e3bbf4800.png`.
- `assets/profile-frames/crown-v2.png`: 30,000 won, illustrated crown and laurel. User approved `exec-5dc43dc0-ba7b-4ba7-8346-e9187fd7c09e.png`.

Prompt specifications used:
- Blossom: polished illustrated cherry blossom avatar frame; transparent inside/outside; softly sculpted petals and subtle gradients, curled tips and overlapping layers, muted blush and sage; slender double-strand rose ring, varied upper-right cluster and smaller lower-left cluster; no gems, sparkle or backdrop.
- Crown: polished 2D mobile UI illustration, subtle three-tone cel shading, small five-point crown, layered curved base band, laurel with one central seam per leaf, warm champagne and ochre; no gems, texture, text or backdrop; transparent opening and outside.
- Ribbon edit: preserve the circular periwinkle-lilac satin ribbon and large transparent opening; add a small asymmetric bottom knot with two compact loops and short tapered ends hugging the rim, pale edge highlight and layered folds; no flowers, crown, gems, stars or extra concentric rings.

The five solid palettes remain available to every frame. Rainbow is selectable and rendered only for spectrum (ribbon), blossom and crown. This is test-mode cosmetic selection, not paid entitlement enforcement; billing remains unimplemented. No database permission change is required for these artwork replacements.

2026-10-10 revision:
- `blossom-v3.png` (built-in image edit of v2): same blossom composition, fewer and smaller sage leaves; transparent background. Final prompt: keep ring and blossoms, reduce leaf number/area by ~40%, keep sage leaves distinct from pink petals and rose rim, preserve circular geometry and alpha.
- `crown-v3.png` (two built-in image edits of v2): crown enlarged ~35% and complete frame inset to protect tip from clipping. Final prompt: retain enlarged crown and ring/leaves, leave at least 7% transparent top margin and 4% at other sides, preserve transparent center.
- Blossom artwork now keeps its original colored leaf and petal layer. CSS applies only a subtle palette tint on top; leaves stay visibly green. The other frames keep full palette tint.

Latest selection:
- `blossom-v4.png` is the user-selected illustrated pink blossom ring (`exec-e9d76a5e-0214-4de5-9be9-16659c8339e4.png`), replacing v3 in the interface.
- The crown frame is aligned around a smaller, circularly clipped photo aperture so the photo stays inside the upper rim.
- The crown alone can use an independent crown color and ring/laurel color. The other tiers retain one color. The test site still grants cosmetic selection without payment.

Final color revision:
- Blossom and crown both support an independent ornament color. The legacy `avatar_crown_color` database field now holds the secondary color for either selected frame; no new permission or schema is needed.
- Crown uses a contour following its curved lower band, eliminating the former rectangular tint around it. Its five-color rainbow progresses left to right; the ring/laurel progresses bottom to top.
- Five blossom regions each receive one rainbow color. Botanical greens and flower stamens retain their source color. The ring has its own vertically blended palette.
- Ribbon uses the same muted coral, yellow, green, sky and violet palette. Rose is warm (354° hue) and lilac is cool violet (266° hue).
- The renderer preserves alpha and source lightness, caches at most 32 rendered variants, and falls back to the original image with a warning if rendering fails.
