# Profile frames

Generated using the built-in GPT image generation tool. The app renders recolored frames to a cached canvas at runtime; profile photos are separate and never recolored.

Runtime assets:
- `ribbon-v3.png`: 5,000 won ribbon with compact bottom knot and a narrow contour.
- `blossom-v5.png`: 10,000 won pink blossom ring with botanical greens and a narrow contour.
- `crown-v3.png`: 30,000 won crown and laurel with safe transparent margins.

Older artwork revisions were removed from the working tree because no runtime code referenced them. They remain recoverable from Git history.

Prompt specifications used:
- Blossom: polished illustrated cherry blossom avatar frame; transparent inside/outside; softly sculpted petals and subtle gradients, curled tips and overlapping layers, muted blush and sage; slender double-strand rose ring, varied upper-right cluster and smaller lower-left cluster; no gems, sparkle or backdrop.
- Crown: polished 2D mobile UI illustration, subtle three-tone cel shading, small five-point crown, layered curved base band, laurel with one central seam per leaf, warm champagne and ochre; no gems, texture, text or backdrop; transparent opening and outside.
- Ribbon edit: preserve the circular periwinkle-lilac satin ribbon and large transparent opening; add a small asymmetric bottom knot with two compact loops and short tapered ends hugging the rim, pale edge highlight and layered folds; no flowers, crown, gems, stars or extra concentric rings.

The five solid palettes remain available to every frame. Rainbow is selectable and rendered only for spectrum (ribbon), blossom and crown. This is test-mode cosmetic selection, not paid entitlement enforcement; billing remains unimplemented. No database permission change is required for these artwork replacements.

Current rendering:
- `ribbon-v3.png` and `blossom-v5.png` use a narrow dark contour along the artwork edge. No separate CSS ring is used for these tiers.
- The crown frame is aligned around a smaller, circularly clipped photo aperture so the photo stays inside the upper rim.
- Blossom and crown can use independent ornament and ring colors. The test site still grants cosmetic selection without payment.

Final color revision:
- Blossom and crown both support an independent ornament color. The legacy `avatar_crown_color` database field now holds the secondary color for either selected frame; no new permission or schema is needed.
- Crown uses a contour following its curved lower band, eliminating the former rectangular tint around it. Its five-color rainbow progresses left to right; the ring/laurel progresses bottom to top.
- Five blossom regions each receive one rainbow color. Botanical greens and flower stamens retain their source color. The ring has its own vertically blended palette.
- Ribbon uses the same muted coral, yellow, green, sky and violet palette. Rose is warm (354° hue) and lilac is cool violet (266° hue).
- The renderer preserves alpha and source lightness, caches at most 32 rendered variants, and falls back to the original image with a warning if rendering fails.
