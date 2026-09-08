"""Assemble performance-upgrade-unlock.gif from kf01-kf05 keyframes."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAMES_DIR = Path(__file__).resolve().parent
OUT_GIF = ROOT / "performance-upgrade-unlock.gif"
OUT_PNG = ROOT / "performance-upsell-illustration.png"
TARGET = (800, 450)


def fit(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    target_ratio = 16 / 9
    cur = w / h
    if cur > target_ratio:
        nw = int(h * target_ratio)
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    elif cur < target_ratio:
        nh = int(w / target_ratio)
        top = (h - nh) // 2
        im = im.crop((0, top, w, top + nh))
    return im.resize(TARGET, Image.Resampling.LANCZOS)


def main() -> None:
    keys = [FRAMES_DIR / f"kf{i:02d}.png" for i in range(1, 6)]
    base = [fit(Image.open(p)) for p in keys]
    base[0].save(OUT_PNG, optimize=True)

    composed: list[Image.Image] = []
    durations: list[int] = []

    def hold(img: Image.Image, ms: int, step: int = 90) -> None:
        for _ in range(max(1, ms // step)):
            composed.append(img)
            durations.append(step)

    def cross(a: Image.Image, b: Image.Image, ms: int, step: int = 90) -> None:
        n = max(2, ms // step)
        for i in range(1, n + 1):
            composed.append(Image.blend(a, b, i / n))
            durations.append(step)

    hold(base[0], 900)
    cross(base[0], base[1], 360)
    hold(base[1], 540)
    cross(base[1], base[2], 360)
    hold(base[2], 450)
    cross(base[2], base[3], 360)
    hold(base[3], 540)
    cross(base[3], base[4], 270)
    hold(base[4], 630)
    cross(base[4], base[0], 450)

    palette_src = base[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames_q = [
        fr.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        .convert("RGB")
        .quantize(palette=palette_src, dither=Image.Dither.NONE)
        for fr in composed
    ]
    frames_q[0].save(
        OUT_GIF,
        save_all=True,
        append_images=frames_q[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )
    print(f"Wrote {OUT_GIF} ({OUT_GIF.stat().st_size} bytes), {len(frames_q)} frames, {sum(durations)}ms")


if __name__ == "__main__":
    main()
