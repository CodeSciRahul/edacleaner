"""Build Boost loader: rocket launching upward with speed trails and exhaust.

Sprites live in scripts/boost-loader-sprites/.
Layered Pillow compositing — rocket rises fast; stars/lines streak downward.
Output: animated WebP + GIF fallback under renderer/assets/performance/.
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
SPRITES = ROOT / "boost-loader-sprites"
OUT_DIR = ROOT.parent / "renderer" / "assets" / "performance"
OUT_WEBP = OUT_DIR / "boost-loader.webp"
OUT_GIF = OUT_DIR / "boost-loader.gif"
PREVIEW_DIR = SPRITES / "_preview"

SIZE = 440
FRAMES = 22
DURATION_MS = 45  # 22 * 45ms ≈ 0.99s/loop

ROCKET_SIZE = 200
GIF_KEY = (255, 0, 254)

# Brand palette — cyan / gold
CYAN = (56, 210, 235)
GOLD = (245, 197, 66)
TEAL = (32, 180, 190)
FLAME_ORANGE = (255, 140, 50)
FLAME_YELLOW = (255, 220, 80)


def key_out_near_black(img: Image.Image, threshold: int = 28) -> Image.Image:
    """Knock out near-black plates so sprites sit in open air."""
    rgba = img.convert("RGBA")
    r, g, b, a = rgba.split()

    def bright_enough(v: int) -> int:
        return 255 if v > threshold else 0

    mask = Image.eval(r, bright_enough)
    for band in (g, b):
        mask = ImageChops.lighter(mask, Image.eval(band, bright_enough))

    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    fringe = Image.eval(r, lambda v: 255 if v > threshold + 16 else 0)
    for band in (g, b):
        fringe = ImageChops.lighter(
            fringe, Image.eval(band, lambda v: 255 if v > threshold + 16 else 0)
        )
    fringe = fringe.filter(ImageFilter.GaussianBlur(radius=0.8))
    mask = ImageChops.multiply(mask, ImageChops.lighter(mask, fringe))

    rgba.putalpha(ImageChops.multiply(a, mask))
    return rgba


def key_out_near_white_flood(img: Image.Image, thresh: int = 30) -> Image.Image:
    """Remove light/near-white studio plates via corner flood-fill."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    work = rgba.convert("RGB")
    for seed in (
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
        (w // 2, 0),
        (0, h // 2),
        (w // 2, h - 1),
        (w - 1, h // 2),
        (10, 10),
        (w - 10, 10),
        (10, h - 10),
        (w - 10, h - 10),
    ):
        try:
            ImageDraw.floodfill(work, seed, GIF_KEY, thresh=thresh)
        except ValueError:
            continue

    r, g, b = work.split()

    def band_eq(band: Image.Image, val: int) -> Image.Image:
        return Image.eval(band, lambda v, vv=val: 255 if v == vv else 0)

    key_mask = ImageChops.multiply(
        ImageChops.multiply(band_eq(r, GIF_KEY[0]), band_eq(g, GIF_KEY[1])),
        band_eq(b, GIF_KEY[2]),
    )
    alpha = ImageOps.invert(key_mask)
    soft = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
    hard = alpha.filter(ImageFilter.MinFilter(3))
    rgba.putalpha(ImageChops.lighter(hard, soft))
    return rgba


def load_sprite(path: Path, size: int, *, plate: str = "auto") -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((size * 3, size * 3), Image.Resampling.LANCZOS)
    corner = img.getpixel((2, 2))
    if plate == "auto":
        plate = "white" if sum(corner[:3]) > 400 else "black"
    if plate == "white":
        if img.getpixel((2, 2))[3] > 8:
            img = key_out_near_white_flood(img)
    else:
        img = key_out_near_black(img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    return img


def paste_centered(base: Image.Image, sprite: Image.Image, cx: float, cy: float, alpha_scale: float = 1.0) -> None:
    if alpha_scale < 0.99:
        spr = sprite.copy()
        r, g, b, a = spr.split()
        a = a.point(lambda v, s=alpha_scale: int(v * s))
        spr = Image.merge("RGBA", (r, g, b, a))
    else:
        spr = sprite
    x = int(round(cx - spr.width / 2))
    y = int(round(cy - spr.height / 2))
    base.alpha_composite(spr, (x, y))


def make_star_field(size: int, t: float, rng: random.Random) -> Image.Image:
    """Parallax stars streaking downward (rocket moving up fast)."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(36):
        seed = i * 7919
        base_x = rng.randint(8, size - 8) if i < 18 else (seed * 17) % (size - 16) + 8
        base_y = ((seed * 31) % size + t * size * (1.8 + (i % 5) * 0.35)) % (size + 40) - 20
        speed = 1.2 + (i % 7) * 0.22
        streak_len = int(8 + (i % 4) * 6 * speed)
        fade = 0.35 + 0.65 * ((i % 6) / 5)
        alpha = int(40 + 100 * fade)
        color = CYAN if i % 3 == 0 else (200, 220, 255)
        x = base_x + math.sin(t * 2 * math.pi + i) * 2
        y = base_y
        d.line(
            [(x, y), (x, y + streak_len)],
            fill=(*color, alpha),
            width=1 if i % 2 else 2,
        )
        if i % 5 == 0:
            r = 1 + i % 3
            d.ellipse([x - r, y - r, x + r, y + r], fill=(*GOLD, int(alpha * 0.7)))
    return layer.filter(ImageFilter.GaussianBlur(radius=0.4))


def make_speed_lines(size: int, t: float, pulse: float) -> Image.Image:
    """Diagonal speed lines rushing past."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = size // 2
    for i in range(14):
        phase = (t + i / 14) % 1.0
        x = cx + (i - 7) * 22 + math.sin(phase * math.pi * 2) * 8
        y_start = (phase * size * 1.3) - size * 0.15
        length = 28 + int(18 * pulse)
        alpha = int(25 + 55 * (1.0 - abs(i - 7) / 7) * pulse)
        d.line(
            [(x, y_start), (x - 6, y_start + length)],
            fill=(*TEAL, alpha),
            width=2,
        )
    return layer.filter(ImageFilter.GaussianBlur(radius=0.8))


def make_exhaust(size: int, cx: float, cy: float, t: float, pulse: float) -> Image.Image:
    """Flame exhaust below rocket — animated flicker."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    base_y = cy + 8
    flicker = 0.7 + 0.3 * math.sin(2 * math.pi * t * 4)
    for j in range(5):
        spread = (j - 2) * 6
        flame_h = int(36 + 22 * pulse * flicker * (1 - abs(j - 2) * 0.15))
        flame_w = int(14 + 6 * (1 - abs(j - 2) * 0.2))
        ox = cx + spread
        oy = base_y + j * 2
        alpha = int(140 + 80 * pulse * (1 - abs(j - 2) * 0.2))
        color = FLAME_ORANGE if j % 2 == 0 else FLAME_YELLOW
        d.ellipse(
            [ox - flame_w // 2, oy, ox + flame_w // 2, oy + flame_h],
            fill=(*color, alpha),
        )
    # Inner hot core
    core_h = int(24 + 14 * pulse * flicker)
    d.ellipse(
        [cx - 8, base_y + 4, cx + 8, base_y + 4 + core_h],
        fill=(255, 255, 200, int(180 * pulse)),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius=2.5))


def make_trail_particles(size: int, cx: float, cy: float, t: float, pulse: float) -> Image.Image:
    """Spark particles trailing behind rocket."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(20):
        local = (t + i / 20) % 1.0
        fade = max(0.0, 1.0 - local * 1.1)
        if fade < 0.06:
            continue
        spread = (i % 9 - 4) * 5
        dist = 20 + local * 90
        px = cx + spread + math.sin(local * math.pi * 3 + i) * 8
        py = cy + 40 + dist
        r = 1 + int(2.5 * fade)
        alpha = int(60 + 120 * fade * pulse)
        color = GOLD if i % 3 == 0 else CYAN
        d.ellipse([px - r, py - r, px + r, py + r], fill=(*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(radius=0.6))


def make_glow(size: int, cx: float, cy: float, pulse: float) -> Image.Image:
    """Soft cyan/gold glow around rocket."""
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    rx = int(70 + 12 * pulse)
    ry = int(90 + 16 * pulse)
    d.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        fill=(CYAN[0], CYAN[1], CYAN[2], int(18 + 22 * pulse)),
    )
    d.ellipse(
        [cx - rx // 2, cy - ry // 2, cx + rx // 2, cy + ry // 2],
        fill=(GOLD[0], GOLD[1], GOLD[2], int(12 + 16 * pulse)),
    )
    return glow.filter(ImageFilter.GaussianBlur(radius=24))


def rgba_to_gif_frame(rgba: Image.Image, palette_img: Image.Image | None) -> Image.Image:
    alpha = rgba.getchannel("A")
    rgb = Image.new("RGB", rgba.size, GIF_KEY)
    rgb.paste(rgba.convert("RGB"), mask=alpha)

    if palette_img is None:
        paletted = rgb.quantize(
            colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
    else:
        paletted = rgb.quantize(palette=palette_img, dither=Image.Dither.NONE)

    palette = paletted.getpalette() or []
    n = len(palette) // 3
    best_i, best_d = 0, 10**9
    for i in range(n):
        r, g, b = palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]
        d = abs(r - GIF_KEY[0]) + abs(g - GIF_KEY[1]) + abs(b - GIF_KEY[2])
        if d < best_d:
            best_d, best_i = d, i

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
    rocket_path = SPRITES / "rocket.png"
    if not rocket_path.exists():
        raise SystemExit(f"Missing sprite: {rocket_path}")

    rocket = load_sprite(rocket_path, ROCKET_SIZE, plate="auto")
    rng = random.Random(42)

    # Rocket rises from lower-center to upper-center over the loop
    start_y = SIZE * 0.72
    end_y = SIZE * 0.28
    cx = SIZE / 2

    os.makedirs(PREVIEW_DIR, exist_ok=True)
    rocket.save(PREVIEW_DIR / "rocket_keyed.png")

    frames: list[Image.Image] = []
    for i in range(FRAMES):
        t = i / FRAMES
        # Ease-in-out for fast upward motion feel
        ease = 0.5 - 0.5 * math.cos(2 * math.pi * t)
        rocket_y = start_y + (end_y - start_y) * ease
        pulse = 0.82 + 0.18 * (0.5 + 0.5 * math.sin(2 * math.pi * t * 2))
        wobble = math.sin(2 * math.pi * t * 3) * 3

        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas = Image.alpha_composite(canvas, make_star_field(SIZE, t, rng))
        canvas = Image.alpha_composite(canvas, make_speed_lines(SIZE, t, pulse))
        canvas = Image.alpha_composite(canvas, make_glow(SIZE, cx + wobble, rocket_y, pulse))
        canvas = Image.alpha_composite(
            canvas, make_trail_particles(SIZE, cx + wobble, rocket_y, t, pulse)
        )
        canvas = Image.alpha_composite(
            canvas, make_exhaust(SIZE, cx + wobble, rocket_y + rocket.height * 0.38, t, pulse)
        )

        # Slight tilt wobble for dynamic feel
        tilt = math.sin(2 * math.pi * t * 2) * 4
        rocket_r = rocket.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
        paste_centered(canvas, rocket_r, cx + wobble, rocket_y)

        frames.append(canvas)
        if i in (0, 5, 11, 17):
            frames[i].save(PREVIEW_DIR / f"frame_{i:02d}.png")

    os.makedirs(OUT_DIR, exist_ok=True)

    frames[0].save(
        OUT_WEBP,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_MS,
        loop=0,
        lossless=False,
        quality=84,
        method=4,
    )

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

    probe = Image.open(OUT_WEBP)
    n = 0
    try:
        while True:
            probe.seek(n)
            n += 1
    except EOFError:
        pass

    probe.seek(0)
    corner_a = probe.convert("RGBA").getpixel((2, 2))[3]
    print(f"Wrote {OUT_WEBP} ({webp_kb:.1f} KB)")
    print(f"Wrote {OUT_GIF} ({gif_kb:.1f} KB)")
    print(f"Frames: {FRAMES}, size: {SIZE}x{SIZE}, duration/frame: {DURATION_MS}ms")
    print(f"Rocket Y: {start_y:.0f} -> {end_y:.0f}")
    print(f"Verified WebP frames: {n}, corner_alpha={corner_a}")
    if webp_kb > 2048:
        print("WARNING: WebP exceeds ~2MB")
    if corner_a > 8:
        print("WARNING: corner not transparent — check keying")


if __name__ == "__main__":
    main()
