#!/usr/bin/env python3
"""Regenerate app icons with a modern squircle (rounded square) mask."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'resources' / 'icons'
SRC = ROOT / 'icon.png'

# Windows Fluent / modern app icons ~22% corner radius
CORNER_RATIO = 0.22
BRAND_BLUE = (37, 99, 235, 255)

OUT_PNG = {
    'icon.png': 1024,
    '512.png': 512,
    'icon-256.png': 256,
}

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
NAMED_ICOS = [16, 24, 32, 48, 64, 96, 128, 192, 256, 512]


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def make_rounded(src: Image.Image, size: int) -> Image.Image:
    base = Image.new('RGBA', src.size, BRAND_BLUE)
    composed = Image.alpha_composite(base, src.convert('RGBA'))
    resized = composed.resize((size, size), Image.Resampling.LANCZOS)

    solid = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    solid.paste(resized.convert('RGB'), (0, 0))
    solid.putalpha(255)

    radius = max(1, int(round(size * CORNER_RATIO)))
    mask = rounded_mask(size, radius)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(solid, (0, 0))
    out.putalpha(mask)
    return out


def main() -> None:
    src = Image.open(SRC).convert('RGBA')
    print(f'source {SRC} {src.size}')

    cache: dict[int, Image.Image] = {}
    for name, size in OUT_PNG.items():
        img = make_rounded(src, size)
        path = ROOT / name
        img.save(path, 'PNG')
        cache[size] = img
        print(f'wrote {path.name} size={size} TL_alpha={img.getpixel((0, 0))[3]}')

    ico_images = [
        cache[s] if s in cache else make_rounded(src, s) for s in ICO_SIZES
    ]
    ico_path = ROOT / 'icon.ico'
    largest = ico_images[-1]
    largest.save(
        ico_path,
        format='ICO',
        append_images=ico_images[:-1],
        bitmap_format='png',
    )

    for s in NAMED_ICOS:
        make_rounded(src, s).save(
            ROOT / f'{s}.ico',
            format='ICO',
            sizes=[(s, s)],
            bitmap_format='png',
        )

    # Keep logo.ico in sync with the main app icon
    largest.save(ROOT / 'logo.ico', format='ICO', sizes=[(256, 256)], bitmap_format='png')

    import struct

    data = ico_path.read_bytes()
    _reserved, _typ, count = struct.unpack_from('<HHH', data, 0)
    frames = []
    off = 6
    for _ in range(count):
        w, h, _c, _r, _p, _bpp, _size, _offset = struct.unpack_from('<BBBBHHII', data, off)
        frames.append((w or 256, h or 256))
        off += 16
    print(f'icon.ico frames {frames}')


if __name__ == '__main__':
    main()
