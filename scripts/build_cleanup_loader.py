"""Build Cleanup loader: standing person (onboarding look) + pivoting jhadu.

Sprites live in scripts/cleanup-loader-sprites/.
Layered compositing — person is FIXED; only the broom rotates about the grip.
Output is an animated WebP with real alpha (clean on light/dark modals).
Also writes a GIF fallback with chroma-keyed transparency.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
SPRITES = ROOT / "cleanup-loader-sprites"
OUT_DIR = ROOT.parent / "renderer" / "assets" / "cleanup"
OUT_WEBP = OUT_DIR / "cleanup-loader.webp"
OUT_GIF = OUT_DIR / "cleanup-loader.gif"
PREVIEW_DIR = SPRITES / "_preview"

SIZE = 460
FRAMES = 24
DURATION_MS = 42  # 24 * 42ms ≈ 1.01s/loop

PERSON_SIZE = 320
BROOM_SIZE = 265
JUNK_SIZE = 40

# Sweep arc about the upper grip (degrees). Person does NOT rotate/sway.
SWEEP_AMP_DEG = 12
# Medial-axis t for the upper-hand grip (thin handle zone ~0.47–0.90).
BROOM_PIVOT_T = 0.72

GIF_KEY = (255, 0, 254)


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
    """Remove light/near-white studio plates via corner flood-fill (keeps dark hair)."""
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


def load_sprite(path: Path, size: int, *, plate: str = "black") -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((size * 3, size * 3), Image.Resampling.LANCZOS)
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


def split_junk_sheet(path: Path, size: int) -> list[Image.Image]:
    """Split a 2x2 junk sheet into four keyed icons."""
    sheet = Image.open(path).convert("RGBA")
    sheet = key_out_near_black(sheet, threshold=24)
    w, h = sheet.size
    cells: list[Image.Image] = []
    for row in range(2):
        for col in range(2):
            left = int(col * w / 2)
            upper = int(row * h / 2)
            right = int((col + 1) * w / 2)
            lower = int((row + 1) * h / 2)
            cell = sheet.crop((left, upper, right, lower))
            bbox = cell.getbbox()
            if not bbox:
                continue
            cell = cell.crop(bbox)
            cell.thumbnail((size, size), Image.Resampling.LANCZOS)
            cells.append(cell)
    return cells


def make_floor_glow(size: int, pulse: float, sweep: float) -> Image.Image:
    """Soft warm dust oval under the sweep zone (reads as cleaning floor)."""
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx = size // 2
    cy = int(size * 0.78)
    rx = int(120 + 12 * pulse)
    ry = int(28 + 7 * pulse)
    cx += int(sweep * 28)
    alpha = int(26 + 20 * pulse)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(210, 180, 120, alpha))
    d.ellipse(
        [cx - rx // 2, cy - ry // 2, cx + rx // 2, cy + ry // 2],
        fill=(180, 150, 100, int(alpha * 0.45)),
    )
    return glow.filter(ImageFilter.GaussianBlur(radius=22))


def make_sweep_trail(size: int, t: float, pulse: float, tip_x: float, tip_y: float) -> Image.Image:
    """Arc of soft dusty motes trailing the broom tip."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(16):
        phase = (i / 15 + t) % 1.0
        lag = i / 15
        ox = tip_x + lag * 50 * math.cos(math.pi * 0.15 + phase * math.pi * 0.55)
        oy = tip_y - lag * 24 * math.sin(phase * math.pi)
        fade = math.sin(phase * math.pi) * (1.0 - lag * 0.65)
        r = 2 + int(2.8 * fade * pulse)
        dust_a = int(32 + 95 * fade * pulse)
        d.ellipse(
            [ox - r, oy - r, ox + r, oy + r],
            fill=(220, 195, 145, dust_a),
        )
        if i % 3 == 0:
            d.ellipse(
                [ox - r - 1, oy - r - 2, ox + r + 1, oy + r],
                fill=(190, 160, 110, int(dust_a * 0.5)),
            )
    return layer.filter(ImageFilter.GaussianBlur(radius=1.5))


def make_sparkles(size: int, frame: int, total: int) -> Image.Image:
    """Soft warm glints around the sweep (subtle clean shine)."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    seeds = [
        (0.22, 0.38, 0.0),
        (0.48, 0.26, 0.2),
        (0.72, 0.40, 0.4),
        (0.62, 0.58, 0.55),
        (0.30, 0.62, 0.7),
        (0.78, 0.52, 0.85),
        (0.40, 0.48, 0.15),
        (0.18, 0.52, 0.9),
        (0.58, 0.32, 0.33),
        (0.44, 0.68, 0.62),
    ]
    t = frame / total
    for sx, sy, offset in seeds:
        pulse = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(2 * math.pi * (t + offset)))
        if pulse < 0.48:
            continue
        x = sx * size
        y = sy * size
        arm = 2 + int(3.2 * pulse)
        a = int(80 + 85 * pulse)
        color = (255, 248, 230, a) if int(offset * 10) % 2 == 0 else (235, 210, 160, a)
        d.line([(x - arm, y), (x + arm, y)], fill=color, width=2)
        d.line([(x, y - arm), (x, y + arm)], fill=color, width=2)
        d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=color)
    return layer.filter(ImageFilter.GaussianBlur(radius=0.6))


def make_dust_motes(
    size: int, t: float, tip_x: float, tip_y: float, sweep_dir: float
) -> Image.Image:
    """Tiny dissolving dust / fragment motes kicked up by the broom."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(22):
        local = (t + i / 22) % 1.0
        fade = max(0.0, 1.0 - local * 1.2)
        if fade < 0.08:
            continue
        spread = -0.55 + (i % 7) * 0.18
        dist = 18 + local * 120 * (0.7 + (i % 4) * 0.12)
        push = -sweep_dir if abs(sweep_dir) > 0.05 else -1.0
        ox = tip_x + push * dist * math.cos(0.2 + spread)
        oy = tip_y - dist * math.sin(0.5 + spread * 0.55) * (0.6 + local * 0.5)
        r = 1 + int(2.4 * fade)
        a = int(70 + 90 * fade)
        if i % 4 == 0:
            d.rectangle([ox - r, oy - r, ox + r, oy + r], fill=(160, 145, 120, a))
        else:
            d.ellipse([ox - r, oy - r, ox + r, oy + r], fill=(200, 175, 130, a))
    return layer.filter(ImageFilter.GaussianBlur(radius=0.8))


def rotate_about_pivot(
    img: Image.Image, angle_deg: float, pivot_x: float, pivot_y: float
) -> tuple[Image.Image, float, float]:
    """Rotate around (pivot_x, pivot_y) in image space; return image + new pivot in result."""
    pad = int(max(img.width, img.height) * 0.55) + 8
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    px = pivot_x + pad
    py = pivot_y + pad
    rotated = canvas.rotate(
        angle_deg, resample=Image.Resampling.BICUBIC, center=(px, py), expand=False
    )
    return rotated, px, py


def paste_at(base: Image.Image, sprite: Image.Image, left: float, top: float) -> None:
    x = int(round(left))
    y = int(round(top))
    base.alpha_composite(sprite, (x, y))


def paste_centered(base: Image.Image, sprite: Image.Image, cx: float, cy: float) -> None:
    x = int(round(cx - sprite.width / 2))
    y = int(round(cy - sprite.height / 2))
    base.alpha_composite(sprite, (x, y))


def rotate_point(
    x: float, y: float, cx: float, cy: float, angle_deg: float
) -> tuple[float, float]:
    """PIL rotate is CCW for positive angles about (cx, cy)."""
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    dx = x - cx
    dy = y - cy
    return cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a


def find_skin_extreme(
    person: Image.Image,
    *,
    y0: int,
    y1: int,
    x0: int,
    x1: int,
    mode: str,
) -> tuple[float, float] | None:
    """Pick the extremity of a skin cluster (hand tip), not the forearm centroid."""
    pts: list[tuple[int, int]] = []
    for y in range(max(0, y0), min(person.height, y1)):
        for x in range(max(0, x0), min(person.width, x1)):
            r, g, b, a = person.getpixel((x, y))
            if a < 200:
                continue
            if r > 160 and g > 110 and b > 80 and r > b and abs(r - g) < 80:
                pts.append((x, y))
    if not pts:
        return None
    if mode == "rightmost":
        x, y = max(pts, key=lambda p: p[0] + 0.2 * p[1])
    else:
        x, y = min(pts, key=lambda p: p[0] - 0.15 * p[1])
    return float(x), float(y)


def broom_medial_axis(
    broom: Image.Image,
) -> tuple[tuple[float, float], tuple[float, float], list[tuple[float, float, float]]]:
    """Return (tip, handle_top, medials) using the handle centerline, not silhouette edge.

    Silhouette tip→top runs along the outer edge; hands need the true wood midline.
    Each medial is (t, x, y) with t in [0,1] from tip toward handle top.
    """
    opaque = [
        (x, y)
        for y in range(broom.height)
        for x in range(broom.width)
        if broom.getpixel((x, y))[3] > 128
    ]
    if not opaque:
        tip = (0.0, broom.height * 0.9)
        top = (broom.width * 0.9, 0.0)
        return tip, top, [(0.0, *tip), (1.0, *top)]

    tip_i = min(opaque, key=lambda p: p[0] - p[1])
    top_i = max(opaque, key=lambda p: p[0] - p[1])
    ax = top_i[0] - tip_i[0]
    ay = top_i[1] - tip_i[1]
    alen = math.hypot(ax, ay) or 1.0
    ux, uy = ax / alen, ay / alen
    nx, ny = -uy, ux

    medials: list[tuple[float, float, float]] = []
    for i in range(0, 41):
        t = i / 40
        cx = tip_i[0] + ax * t
        cy = tip_i[1] + ay * t
        hits: list[int] = []
        for s in range(-45, 46):
            x = int(round(cx + nx * s))
            y = int(round(cy + ny * s))
            if 0 <= x < broom.width and 0 <= y < broom.height:
                if broom.getpixel((x, y))[3] > 128:
                    hits.append(s)
        if not hits:
            continue
        mid_s = (min(hits) + max(hits)) / 2
        medials.append((t, cx + nx * mid_s, cy + ny * mid_s))

    if not medials:
        tip = (float(tip_i[0]), float(tip_i[1]))
        top = (float(top_i[0]), float(top_i[1]))
        return tip, top, [(0.0, *tip), (1.0, *top)]

    tip = (medials[0][1], medials[0][2])
    top = (medials[-1][1], medials[-1][2])
    return tip, top, medials


def broom_point_at_t(
    medials: list[tuple[float, float, float]], t: float
) -> tuple[float, float]:
    """Interpolate medial (x,y) at parameter t."""
    if not medials:
        return 0.0, 0.0
    if t <= medials[0][0]:
        return medials[0][1], medials[0][2]
    if t >= medials[-1][0]:
        return medials[-1][1], medials[-1][2]
    for i in range(len(medials) - 1):
        t0, x0, y0 = medials[i]
        t1, x1, y1 = medials[i + 1]
        if t0 <= t <= t1:
            u = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
    return medials[-1][1], medials[-1][2]


def extract_hand_caps(
    person: Image.Image,
    centers: list[tuple[float, float]],
    radius: int = 28,
) -> tuple[Image.Image, Image.Image]:
    """Split hand patches from the body so the broom can sit between torso and grips.

    Returns (body_without_hands, hand_overlay).
    """
    body = person.copy()
    hands = Image.new("RGBA", person.size, (0, 0, 0, 0))
    src = person.load()
    body_px = body.load()
    hands_px = hands.load()
    r2 = radius * radius
    for cx, cy in centers:
        x0 = max(0, int(cx - radius))
        x1 = min(person.width, int(cx + radius) + 1)
        y0 = max(0, int(cy - radius))
        y1 = min(person.height, int(cy + radius) + 1)
        for y in range(y0, y1):
            for x in range(x0, x1):
                dx = x - cx
                dy = y - cy
                if dx * dx + dy * dy > r2:
                    continue
                pix = src[x, y]
                if pix[3] > 16:
                    hands_px[x, y] = pix
                    body_px[x, y] = (0, 0, 0, 0)
    return body, hands


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
    person = load_sprite(SPRITES / "cleaner-person.png", PERSON_SIZE, plate="white")
    broom = load_sprite(SPRITES / "broom.png", BROOM_SIZE, plate="black")
    junk_icons = split_junk_sheet(SPRITES / "junk-sheet.png", JUNK_SIZE)
    if len(junk_icons) < 2:
        junk_icons = [load_sprite(SPRITES / "junk-sheet.png", JUNK_SIZE)]

    # Grip points in person sprite space (open C-hands from onboarding-matched art).
    upper = find_skin_extreme(
        person,
        y0=55,
        y1=100,
        x0=person.width // 2,
        x1=person.width,
        mode="rightmost",
    )
    lower = find_skin_extreme(
        person,
        y0=130,
        y1=190,
        x0=0,
        x1=person.width // 2,
        mode="leftmost",
    )
    if upper is None:
        upper = (person.width * 0.98, person.height * 0.24)
    if lower is None:
        lower = (person.width * 0.14, person.height * 0.57)

    # Pivot at the upper grip — keeps the visible high hand locked through the sweep.
    grip_x, grip_y = upper
    _tip_pt, _top_pt, medials = broom_medial_axis(broom)
    broom_px, broom_py = broom_point_at_t(medials, BROOM_PIVOT_T)
    # Bristle tip for particles — medial near the fan end.
    tip_local = broom_point_at_t(medials, 0.08)
    person_body, hand_caps = extract_hand_caps(person, [upper, lower], radius=32)

    particles = []
    for i in range(16):
        particles.append(
            {
                "icon": junk_icons[i % len(junk_icons)],
                "phase": i / 16,
                "spread": -0.5 + (i % 6) * 0.2,
                "lift": 0.6 + (i % 4) * 0.14,
                "scale": 0.62 + (i % 3) * 0.16,
            }
        )

    frames: list[Image.Image] = []
    # Person locked at canvas center (slight downward bias for floor room).
    person_left = (SIZE - person.width) / 2
    person_top = (SIZE - person.height) / 2 + 8
    grip_canvas_x = person_left + grip_x
    grip_canvas_y = person_top + grip_y

    os.makedirs(PREVIEW_DIR, exist_ok=True)
    person.save(PREVIEW_DIR / "person_keyed.png")
    broom.save(PREVIEW_DIR / "broom_keyed.png")

    for i in range(FRAMES):
        t = i / FRAMES
        sweep_dir = math.sin(2 * math.pi * t)  # -1..1
        pulse = 0.84 + 0.16 * (0.5 + 0.5 * math.sin(2 * math.pi * t * 2))
        # Only the broom rotates — person stays put.
        angle = sweep_dir * SWEEP_AMP_DEG

        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas = Image.alpha_composite(canvas, make_floor_glow(SIZE, pulse, sweep_dir))

        broom_r, piv_rx, piv_ry = rotate_about_pivot(broom, angle, broom_px, broom_py)
        broom_left = grip_canvas_x - piv_rx
        broom_top = grip_canvas_y - piv_ry

        tip_x, tip_y = rotate_point(
            tip_local[0] + (piv_rx - broom_px),
            tip_local[1] + (piv_ry - broom_py),
            piv_rx,
            piv_ry,
            angle,
        )
        tip_x += broom_left
        tip_y += broom_top

        canvas = Image.alpha_composite(
            canvas, make_sweep_trail(SIZE, t, pulse, tip_x, tip_y)
        )
        canvas = Image.alpha_composite(
            canvas, make_dust_motes(SIZE, t, tip_x, tip_y, sweep_dir)
        )

        tip_glow = Image.new("RGBA", (100, 54), (0, 0, 0, 0))
        gd = ImageDraw.Draw(tip_glow)
        gd.ellipse([0, 0, 100, 54], fill=(200, 170, 110, int(32 + 28 * pulse)))
        tip_glow = tip_glow.filter(ImageFilter.GaussianBlur(radius=14))
        paste_centered(canvas, tip_glow, tip_x, tip_y)

        # Depth: body → broom through open grips → hands on top of handle.
        # Person pixels are identical every frame (no sway/rotate/brightness pulse).
        paste_at(canvas, person_body, person_left, person_top)
        paste_at(canvas, broom_r, broom_left, broom_top)
        paste_at(canvas, hand_caps, person_left, person_top)

        for p in particles:
            local = (t + p["phase"]) % 1.0
            energy = 0.4 + 0.6 * max(0.0, math.sin(2 * math.pi * local))
            push = -1.0 if sweep_dir >= 0 else 1.0
            dist = 24 + local * 150 * p["lift"]
            px = tip_x + push * dist * math.cos(0.15 + p["spread"])
            py = tip_y - dist * math.sin(0.5 + p["spread"] * 0.55) * p["lift"]
            fade = max(0.0, 1.0 - local * 1.18)
            if fade < 0.05:
                continue
            icon = p["icon"]
            sc = p["scale"] * (0.8 + 0.3 * energy) * (0.5 + 0.5 * fade)
            iw = max(10, int(icon.width * sc))
            ih = max(10, int(icon.height * sc))
            scaled = icon.resize((iw, ih), Image.Resampling.LANCZOS)
            r, g, b, a = scaled.split()
            a = a.point(lambda v, f=fade: int(v * f * (0.5 + 0.5 * energy)))
            scaled = Image.merge("RGBA", (r, g, b, a))
            spin = local * 50 * (1 if int(p["phase"] * 10) % 2 == 0 else -1)
            scaled = scaled.rotate(spin, resample=Image.Resampling.BICUBIC, expand=True)
            paste_centered(canvas, scaled, px, py)

        canvas = Image.alpha_composite(canvas, make_sparkles(SIZE, i, FRAMES))
        frames.append(canvas)

        if i in (0, 6, 12, 18):
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
    print(f"Person fixed @ ({person_left:.0f},{person_top:.0f}); grip pivot canvas=({grip_canvas_x:.0f},{grip_canvas_y:.0f})")
    print(f"Hands person-space: upper={upper}, lower={lower}, mid=({grip_x:.1f},{grip_y:.1f})")
    print(f"Sweep amp: ±{SWEEP_AMP_DEG}°; broom pivot t={BROOM_PIVOT_T}")
    print(f"Verified WebP frames: {n}, mode={probe.mode}, corner_alpha={corner_a}")
    if webp_kb > 2048:
        print("WARNING: WebP exceeds ~2MB — consider fewer colors or smaller icons")
    if corner_a > 8:
        print("WARNING: corner not transparent — check keying")


if __name__ == "__main__":
    main()
