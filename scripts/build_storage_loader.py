"""Build Storage loader: glass HDD + scan beam + pie segments + indexing motifs.

Programmatic Pillow compositing — transparent WebP + GIF fallback.
Also writes light/dark modal background plates for StorageLoaderModal.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT.parent / "renderer" / "assets" / "storage"
OUT_WEBP = OUT_DIR / "storage-loader.webp"
OUT_GIF = OUT_DIR / "storage-loader.gif"
MODAL_BG_LIGHT = OUT_DIR / "loader-modal-bg-light.png"
MODAL_BG_DARK = OUT_DIR / "loader-modal-bg-dark.png"
PREVIEW_DIR = ROOT / "storage-loader-sprites" / "_preview"

SIZE = 440
FRAMES = 24
DURATION_MS = 46  # ~1.1s loop

GIF_KEY = (255, 0, 254)

# Brand palette — cyan / teal / blue
CYAN = (56, 210, 235)
TEAL = (32, 180, 190)
BLUE = (70, 130, 255)
GLASS = (200, 230, 245)
DISK_BODY = (120, 145, 170)
DISK_RIM = (180, 205, 225)

PIE_COLORS = [
    (56, 210, 235, 210),
    (70, 130, 255, 210),
    (32, 180, 190, 210),
    (100, 220, 200, 210),
    (140, 180, 255, 200),
]


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


def draw_disk_platter(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, pulse: float) -> None:
    """Glassmorphism HDD platter."""
    outer = r + 6
    d.ellipse(
        [cx - outer, cy - outer, cx + outer, cy + outer],
        fill=(DISK_RIM[0], DISK_RIM[1], DISK_RIM[2], int(140 + 40 * pulse)),
    )
    d.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=(DISK_BODY[0], DISK_BODY[1], DISK_BODY[2], 220),
    )
    # Inner glass highlight
    d.ellipse(
        [cx - int(r * 0.72), cy - int(r * 0.72), cx + int(r * 0.72), cy + int(r * 0.72)],
        fill=(GLASS[0], GLASS[1], GLASS[2], int(55 + 25 * pulse)),
    )
    # Spindle
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(90, 110, 130, 240))
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(160, 185, 210, 255))


def draw_pie_segments(
    base: Image.Image, cx: int, cy: int, r: int, fill_t: float, pulse: float
) -> None:
    """Pie chart segments that progressively fill over the loop."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    start = -90
    weights = [0.28, 0.22, 0.18, 0.17, 0.15]
    visible = int(len(weights) * min(1.0, fill_t * 1.15))
    for i in range(visible):
        sweep = weights[i] * 360
        color = PIE_COLORS[i % len(PIE_COLORS)]
        alpha = int(color[3] * (0.65 + 0.35 * pulse))
        d.pieslice(
            [cx - r, cy - r, cx + r, cy + r],
            start=start,
            end=start + sweep,
            fill=(color[0], color[1], color[2], alpha),
        )
        start += sweep
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=0.4)))


def draw_scan_beam(base: Image.Image, cx: int, cy: int, radius: int, angle_deg: float, pulse: float) -> None:
    """Rotating cyan scan beam across the disk."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rad = math.radians(angle_deg)
    beam_w = 28
    for spread in (-beam_w * 0.35, 0, beam_w * 0.35):
        a = rad + math.radians(spread)
        x2 = cx + math.cos(a) * (radius + 38)
        y2 = cy + math.sin(a) * (radius + 38)
        alpha = int(90 + 70 * pulse) if spread == 0 else int(35 + 30 * pulse)
        color = CYAN if spread == 0 else TEAL
        d.line([(cx, cy), (x2, y2)], fill=(*color, alpha), width=4 if spread == 0 else 2)
    # Arc highlight on rim
    arc_start = angle_deg - 22
    arc_end = angle_deg + 22
    d.arc(
        [cx - radius - 4, cy - radius - 4, cx + radius + 4, cy + radius + 4],
        start=arc_start,
        end=arc_end,
        fill=(*CYAN, int(120 + 80 * pulse)),
        width=5,
    )
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=1.2)))


def draw_orbit_guides(base: Image.Image, cx: int, cy: int, pulse: float) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for rx, ry, a in ((168, 132, 16), (198, 158, 10)):
        d.ellipse(
            [cx - rx, cy - ry, cx + rx, cy + ry],
            outline=(*CYAN, int(a + 10 * pulse)),
            width=1,
        )
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=1.0)))


def draw_folder_icon(size: int, color: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = size, size
    tab_w = int(w * 0.38)
    tab_h = int(h * 0.18)
    body_top = int(h * 0.28)
    d.rounded_rectangle(
        [2, body_top, w - 2, h - 4],
        radius=5,
        fill=(*color, 230),
    )
    d.rounded_rectangle(
        [2, body_top - tab_h + 2, 2 + tab_w, body_top + 4],
        radius=4,
        fill=(*color, 240),
    )
    d.line([(8, body_top + 10), (w - 8, body_top + 10)], fill=(255, 255, 255, 80), width=1)
    return img


def draw_file_icon(size: int, color: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = size, size
    fold = int(w * 0.28)
    d.polygon(
        [(4, 2), (w - fold - 4, 2), (w - 4, fold + 2), (w - 4, h - 4), (4, h - 4)],
        fill=(*color, 230),
    )
    d.polygon(
        [(w - fold - 4, 2), (w - 4, fold + 2), (w - fold - 4, fold + 2)],
        fill=(255, 255, 255, 90),
    )
    d.line([(10, h * 0.45), (w - 10, h * 0.45)], fill=(255, 255, 255, 70), width=2)
    d.line([(10, h * 0.58), (w - 16, h * 0.58)], fill=(255, 255, 255, 50), width=2)
    return img


def draw_magnifier(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = size // 2 - 8
    cx, cy = size // 2 - 4, size // 2 - 4
    d.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        outline=(*CYAN, 240),
        width=4,
    )
    d.ellipse(
        [cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6],
        fill=(CYAN[0], CYAN[1], CYAN[2], 40),
    )
    handle_len = size // 3
    hx = cx + int(r * 0.65)
    hy = cy + int(r * 0.65)
    d.line(
        [(hx, hy), (hx + handle_len, hy + handle_len)],
        fill=(*TEAL, 240),
        width=5,
    )
    return img


def draw_duplicate_pair(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size // 2 - 2
    f1 = draw_file_icon(s, BLUE)
    f2 = draw_file_icon(s, TEAL)
    img.alpha_composite(f1, (2, 6))
    img.alpha_composite(f2, (s - 6, 2))
    # Link dots
    lx = size // 2
    d.ellipse([lx - 3, size // 2 - 3, lx + 3, size // 2 + 3], fill=(*CYAN, 220))
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


def make_center_glow(size: int, pulse: float) -> Image.Image:
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx = cy = size // 2
    d.ellipse(
        [cx - 110, cy - 100, cx + 110, cy + 110],
        fill=(CYAN[0], CYAN[1], CYAN[2], int(22 + 18 * pulse)),
    )
    return glow.filter(ImageFilter.GaussianBlur(radius=26))


def make_frame(i: int, total: int, icons: dict[str, Image.Image]) -> Image.Image:
    t = i / total
    pulse = 0.82 + 0.18 * (0.5 + 0.5 * math.sin(2 * math.pi * t * 2))
    beam_angle = t * 360 - 90
    fill_t = (t * 1.4) % 1.0

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cx = cy = SIZE // 2
    disk_r = 78

    canvas = Image.alpha_composite(canvas, make_center_glow(SIZE, pulse))
    draw_orbit_guides(canvas, cx, cy, pulse)

    # Orbiting folder/file icons — indexing motif
    orbit_items = [
        (icons["folder"], 0.0, 168, 132, 42),
        (icons["file"], 0.25, 168, 132, 36),
        (icons["folder"], 0.5, 198, 158, 38),
        (icons["file"], 0.75, 198, 158, 34),
    ]
    for sprite, phase, rx, ry, sz in orbit_items:
        ang = 2 * math.pi * (t + phase)
        ox = cx + math.cos(ang) * rx
        oy = cy + math.sin(ang) * ry * 0.82
        depth = 0.55 + 0.45 * (0.5 + 0.5 * math.sin(ang))
        fade = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(2 * math.pi * (t + phase * 2)))
        scaled = sprite.resize((sz, sz), Image.Resampling.LANCZOS)
        paste_centered(canvas, scaled, ox, oy, alpha_scale=fade * depth)

    # Duplicate pair — pulses opposite phase
    dup_pulse = 0.5 + 0.5 * math.sin(2 * math.pi * t * 3)
    dup_x = cx + 118 * math.cos(2 * math.pi * t + 0.8)
    dup_y = cy - 88 + 12 * math.sin(2 * math.pi * t * 2)
    dup = icons["dup"].resize((44, 44), Image.Resampling.LANCZOS)
    paste_centered(canvas, dup, dup_x, dup_y, alpha_scale=0.35 + 0.65 * dup_pulse)

    # Disk + pie + beam
    disk_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(disk_layer)
    draw_disk_platter(d, cx, cy, disk_r, pulse)
    canvas.alpha_composite(disk_layer)
    draw_pie_segments(canvas, cx, cy, disk_r - 8, fill_t, pulse)
    draw_scan_beam(canvas, cx, cy, disk_r, beam_angle, pulse)

    # Magnifying glass sweeps lower arc
    mag_ang = math.pi * 0.15 + t * math.pi * 1.35
    mag_r = disk_r + 52
    mag_x = cx + math.cos(mag_ang) * mag_r
    mag_y = cy + math.sin(mag_ang) * mag_r * 0.75
    mag = icons["mag"].resize((56, 56), Image.Resampling.LANCZOS)
    paste_centered(canvas, mag, mag_x, mag_y, alpha_scale=0.75 + 0.25 * pulse)

    # Sparkle glints
    sparkle = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sparkle)
    for j, (sx, sy, off) in enumerate(
        [(0.34, 0.28, 0.0), (0.66, 0.32, 0.3), (0.58, 0.68, 0.55), (0.38, 0.62, 0.75)]
    ):
        sp = 0.5 + 0.5 * math.sin(2 * math.pi * (t + off))
        if sp < 0.55:
            continue
        x, y = sx * SIZE, sy * SIZE
        arm = 2 + int(2 * sp)
        a = int(70 + 60 * sp)
        sd.line([(x - arm, y), (x + arm, y)], fill=(255, 255, 255, a), width=2)
        sd.line([(x, y - arm), (x, y + arm)], fill=(255, 255, 255, a), width=2)
    canvas.alpha_composite(sparkle.filter(ImageFilter.GaussianBlur(radius=0.5)))

    return canvas


def make_modal_bg(width: int, height: int, *, dark: bool) -> Image.Image:
    """Soft storage-themed modal plate — disk, folders, scan beam hints."""
    base_color = (12, 18, 28) if dark else (240, 248, 252)
    img = Image.new("RGBA", (width, height), (*base_color, 255))
    d = ImageDraw.Draw(img)

    # Gradient wash
    grad = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(height):
        u = y / height
        if dark:
            c = (
                int(12 + 18 * u),
                int(18 + 28 * u),
                int(28 + 35 * u),
                255,
            )
        else:
            c = (
                int(248 - 18 * u),
                int(252 - 8 * u),
                int(255 - 12 * u),
                255,
            )
        gd.line([(0, y), (width, y)], fill=c)
    img = Image.alpha_composite(img.convert("RGBA"), grad)

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    accent = CYAN if not dark else (80, 200, 230)
    accent2 = TEAL if not dark else (50, 160, 180)
    alpha_disk = 28 if dark else 22
    alpha_beam = 35 if dark else 28

    # Faint disks in corners
    for dx, dy, r in ((width * 0.12, height * 0.2, 52), (width * 0.88, height * 0.75, 44)):
        od.ellipse(
            [dx - r, dy - r, dx + r, dy + r],
            outline=(*accent, alpha_disk),
            width=2,
        )
        od.ellipse(
            [dx - r * 0.55, dy - r * 0.55, dx + r * 0.55, dy + r * 0.55],
            fill=(*accent2, alpha_disk // 2),
        )

    # Scan beam diagonals
    od.line([(0, height * 0.35), (width * 0.55, 0)], fill=(*accent, alpha_beam), width=3)
    od.line([(width, height * 0.65), (width * 0.4, height)], fill=(*accent2, alpha_beam), width=2)

    # Folder silhouettes
    for fx, fy, fw, fh in (
        (width * 0.08, height * 0.62, 36, 28),
        (width * 0.78, height * 0.18, 32, 24),
    ):
        od.rounded_rectangle(
            [fx, fy + fh * 0.3, fx + fw, fy + fh],
            radius=4,
            fill=(*accent, 20 if dark else 16),
        )
        od.rounded_rectangle(
            [fx, fy + fh * 0.15, fx + fw * 0.45, fy + fh * 0.35],
            radius=3,
            fill=(*accent2, 24 if dark else 18),
        )

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1.5))
    img = Image.alpha_composite(img, overlay)
    return img.convert("RGB")


def main() -> None:
    import sys

    icons = {
        "folder": draw_folder_icon(48, BLUE),
        "file": draw_file_icon(44, TEAL),
        "mag": draw_magnifier(64),
        "dup": draw_duplicate_pair(52),
    }

    os.makedirs(PREVIEW_DIR, exist_ok=True)
    frames: list[Image.Image] = []
    for i in range(FRAMES):
        fr = make_frame(i, FRAMES, icons)
        frames.append(fr)
        if i in (0, 6, 12, 18):
            fr.save(PREVIEW_DIR / f"frame_{i:02d}.png")

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

    # Modal backgrounds are curated branded assets (GenerateImage + Pillow).
    # The programmatic fallback is low-fidelity — only write with --modal-bg.
    if "--modal-bg" in sys.argv:
        make_modal_bg(720, 900, dark=False).save(MODAL_BG_LIGHT, optimize=True)
        make_modal_bg(720, 900, dark=True).save(MODAL_BG_DARK, optimize=True)

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
    if "--modal-bg" in sys.argv:
        print(f"Wrote {MODAL_BG_LIGHT}")
        print(f"Wrote {MODAL_BG_DARK}")
    elif MODAL_BG_LIGHT.exists():
        print(f"Kept curated modal backgrounds ({MODAL_BG_LIGHT.name}, {MODAL_BG_DARK.name})")
    print(f"Frames: {FRAMES}, size: {SIZE}x{SIZE}, duration/frame: {DURATION_MS}ms")
    print(f"Verified WebP frames: {n}, corner_alpha={corner_a}")
    if webp_kb > 2048:
        print("WARNING: WebP exceeds ~2MB")


if __name__ == "__main__":
    main()
