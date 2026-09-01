"""Build Smart Scan loader: fixed center PC + airy orbiting icons.

Sprites live in scripts/scan-loader-sprites/.
Output is an animated WebP with real alpha (clean on light/dark modals).
Also writes a GIF fallback with chroma-keyed transparency.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent
SPRITES = ROOT / "scan-loader-sprites"
OUT_DIR = ROOT.parent / "renderer" / "assets" / "smart-scan"
OUT_WEBP = OUT_DIR / "scan-loader.webp"
OUT_GIF = OUT_DIR / "scan-loader.gif"

SIZE = 420
FRAMES = 24
DURATION_MS = 45  # 24 * 45ms ≈ 1.08s/rev

# Airy ellipse — icons float clear of the PC
ORBIT_RX = 178
ORBIT_RY = 142
ICON_SIZE = 58
CENTER_SIZE = 190

# Chroma key for GIF transparency (not used in art after near-black knock-out)
GIF_KEY = (255, 0, 254)


def key_out_near_black(img: Image.Image, threshold: int = 32) -> Image.Image:
    """Knock out near-black / #0a0a0f plates so sprites sit in open air."""
    rgba = img.convert("RGBA")
    r, g, b, a = rgba.split()

    def bright_enough(v: int) -> int:
        return 255 if v > threshold else 0

    mask = Image.eval(r, bright_enough)
    for band in (g, b):
        mask = ImageChops.lighter(mask, Image.eval(band, bright_enough))

    # Soften edges so keyed sprites don't look cut-out
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    # Slightly erode residual dark fringe
    fringe = Image.eval(r, lambda v: 255 if v > threshold + 18 else 0)
    for band in (g, b):
        fringe = ImageChops.lighter(fringe, Image.eval(band, lambda v: 255 if v > threshold + 18 else 0))
    fringe = fringe.filter(ImageFilter.GaussianBlur(radius=0.8))
    mask = ImageChops.multiply(mask, ImageChops.lighter(mask, fringe))

    rgba.putalpha(ImageChops.multiply(a, mask))
    return rgba


def load_sprite(path: Path, size: int) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((size * 3, size * 3), Image.Resampling.LANCZOS)
    img = key_out_near_black(img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    return img


def make_orbit_rings(size: int, pulse: float) -> Image.Image:
    """Faint dashed-feel orbit guides — very soft, no solid plates."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = cy = size // 2
    alpha = int(18 + 14 * pulse)
    for scale, width in ((1.0, 1), (0.82, 1)):
        rx = int(ORBIT_RX * scale)
        ry = int(ORBIT_RY * scale)
        a = max(6, int(alpha * (0.65 if scale != 1.0 else 1.0)))
        d.ellipse(
            [cx - rx, cy - ry, cx + rx, cy + ry],
            outline=(120, 220, 255, a),
            width=width,
        )
    return layer.filter(ImageFilter.GaussianBlur(radius=1.4))


def make_center_aura(size: int, pulse: float) -> Image.Image:
    """Soft radial glow behind the PC — cyan, no opaque well."""
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx = cy = size // 2
    alpha = int(28 + 22 * pulse)
    d.ellipse([cx - 95, cy - 88, cx + 95, cy + 102], fill=(0, 190, 255, alpha))
    return glow.filter(ImageFilter.GaussianBlur(radius=28))


def make_icon_soft_glow(iw: int, ih: int, pulse: float, depth: float) -> Image.Image:
    """Airy halo under/around an icon — no black disc."""
    pad = 28
    glow = Image.new("RGBA", (iw + pad * 2, ih + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    ga = int(36 + 28 * pulse * (0.55 + 0.45 * depth))
    # Soft oval slightly below icon center for float shadow
    d.ellipse(
        [pad - 4, pad + ih // 3, pad + iw + 4, pad + ih + 10],
        fill=(80, 210, 255, ga),
    )
    return glow.filter(ImageFilter.GaussianBlur(radius=10))


def paste_centered(base: Image.Image, sprite: Image.Image, cx: float, cy: float) -> None:
    x = int(round(cx - sprite.width / 2))
    y = int(round(cy - sprite.height / 2))
    base.alpha_composite(sprite, (x, y))


def rgba_to_gif_frame(rgba: Image.Image, palette_img: Image.Image | None) -> Image.Image:
    """Flatten transparent pixels to GIF_KEY, then quantize with transparency."""
    alpha = rgba.getchannel("A")
    rgb = Image.new("RGB", rgba.size, GIF_KEY)
    rgb.paste(rgba.convert("RGB"), mask=alpha)

    if palette_img is None:
        paletted = rgb.quantize(
            colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
    else:
        paletted = rgb.quantize(palette=palette_img, dither=Image.Dither.NONE)

    # Force fully transparent source pixels to the key index
    # Find palette index closest to GIF_KEY
    palette = paletted.getpalette() or []
    n = len(palette) // 3
    best_i, best_d = 0, 10**9
    for i in range(n):
        r, g, b = palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]
        d = abs(r - GIF_KEY[0]) + abs(g - GIF_KEY[1]) + abs(b - GIF_KEY[2])
        if d < best_d:
            best_d, best_i = d, i

    # Remap low-alpha pixels to transparency index
    mask = Image.eval(alpha, lambda a: 1 if a < 16 else 0)
    px = paletted.load()
    mx = mask.load()
    w, h = paletted.size
    for y in range(h):
        for x in range(w):
            if mx[x, y]:
                px[x, y] = best_i

    paletted.info["transparency"] = best_i
    return paletted


def main() -> None:
    center = load_sprite(SPRITES / "center-pc.png", CENTER_SIZE)

    icon_files = [
        "icon-hdd.png",
        "icon-db.png",
        "icon-cpu.png",
        "icon-gauge.png",
        "icon-ram.png",
        "icon-ssd.png",
        "icon-recycle.png",
    ]
    icons = [load_sprite(SPRITES / name, ICON_SIZE) for name in icon_files]
    n_icons = len(icons)

    frames: list[Image.Image] = []
    cx = cy = SIZE // 2

    for i in range(FRAMES):
        base_angle = 2 * math.pi * i / FRAMES
        pulse = 0.82 + 0.18 * (0.5 + 0.5 * math.sin(2 * math.pi * i / FRAMES))

        # Fully transparent canvas — no black plate
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas = Image.alpha_composite(canvas, make_center_aura(SIZE, pulse))
        canvas = Image.alpha_composite(canvas, make_orbit_rings(SIZE, pulse))

        # Fixed center PC (gentle brightness pulse)
        pc = ImageEnhance.Brightness(center).enhance(0.97 + 0.06 * pulse)
        paste_centered(canvas, pc, cx, cy - 4)

        # Orbiting icons — back-to-front by Y; soft float bob
        placements: list[tuple[float, Image.Image, float, float]] = []
        for j, icon in enumerate(icons):
            angle = base_angle + (2 * math.pi * j / n_icons)
            # Light vertical bob so icons feel airborne
            bob = 5.0 * math.sin(base_angle * 2 + j * 0.9)
            ix = cx + ORBIT_RX * math.cos(angle)
            iy = cy + ORBIT_RY * math.sin(angle) + bob
            depth = 0.5 + 0.5 * math.sin(angle)
            scale = 0.78 + 0.24 * depth
            iw = max(22, int(icon.width * scale))
            ih = max(22, int(icon.height * scale))
            scaled = icon.resize((iw, ih), Image.Resampling.LANCZOS)
            glow = make_icon_soft_glow(iw, ih, pulse, depth)
            placements.append((iy - 0.02, glow, ix, iy + 2))
            placements.append((iy, scaled, ix, iy))

        placements.sort(key=lambda t: t[0])
        for _, spr, px, py in placements:
            paste_centered(canvas, spr, px, py)

        frames.append(canvas)

    os.makedirs(OUT_DIR, exist_ok=True)

    # --- Animated WebP (preferred: true alpha) ---
    frames[0].save(
        OUT_WEBP,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_MS,
        loop=0,
        lossless=False,
        quality=85,
        method=4,
    )

    # --- GIF fallback with transparency ---
    gif_frames: list[Image.Image] = []
    palette_ref: Image.Image | None = None
    for fr in frames:
        gf = rgba_to_gif_frame(fr, palette_ref)
        if palette_ref is None:
            palette_ref = gf
        gif_frames.append(gf)

    gif_frames[0].save(
        OUT_GIF,
        save_all=True,
        append_images=gif_frames[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=False,
        disposal=2,
        transparency=gif_frames[0].info["transparency"],
    )

    webp_kb = os.path.getsize(OUT_WEBP) / 1024
    gif_kb = os.path.getsize(OUT_GIF) / 1024

    # Verify WebP frames
    probe = Image.open(OUT_WEBP)
    n = 0
    try:
        while True:
            probe.seek(n)
            n += 1
    except EOFError:
        pass

    print(f"Wrote {OUT_WEBP} ({webp_kb:.1f} KB)")
    print(f"Wrote {OUT_GIF} ({gif_kb:.1f} KB)")
    print(f"Frames: {FRAMES}, size: {SIZE}x{SIZE}, duration/frame: {DURATION_MS}ms")
    print(f"Verified WebP frames: {n}, mode={probe.mode}")
    if webp_kb > 2048:
        print("WARNING: WebP exceeds ~2MB — consider fewer colors or smaller icons")


if __name__ == "__main__":
    main()
