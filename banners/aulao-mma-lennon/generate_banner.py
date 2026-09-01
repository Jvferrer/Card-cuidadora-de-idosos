#!/usr/bin/env python3
"""Gera banners de divulgação do Aulão de MMA, Striking e Grappling.

A foto da turma é recortada apenas para remover a UI da galeria do iPhone.
Nenhum rosto é alterado, gerado ou retocado — só enquadramento, cor global e texto.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
SRC = ROOT / "src" / "turma-original.jpg"
OUT = ROOT / "export"

RED = (220, 20, 40)
RED_DEEP = (120, 8, 20)
GOLD = (245, 197, 24)
WHITE = (255, 255, 255)
OFFWHITE = (236, 236, 238)
MUTED = (168, 168, 172)
BLACK = (8, 8, 10)
CHARCOAL = (20, 20, 24)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def text_wh(font: ImageFont.FreeTypeFont, text: str) -> tuple[int, int]:
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def text_width(font: ImageFont.FreeTypeFont, text: str, tracking: int = 0) -> int:
    if tracking == 0:
        return text_wh(font, text)[0]
    glyphs = list(text)
    return sum(text_wh(font, g)[0] for g in glyphs) + tracking * (len(glyphs) - 1)


def draw_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int = 0,
) -> None:
    x, y = xy
    if tracking == 0:
        draw.text((x, y), text, font=font, fill=fill)
        return
    for g in text:
        draw.text((x, y), g, font=font, fill=fill)
        x += text_wh(font, g)[0] + tracking


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    canvas_w: int,
    tracking: int = 0,
) -> int:
    w = text_width(font, text, tracking)
    draw_text(draw, ((canvas_w - w) // 2, y), text, font, fill, tracking)
    return text_wh(font, text)[1]


def draw_outlined_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int],
    canvas_w: int,
    stroke: int = 3,
) -> int:
    w, h = text_wh(font, text)
    x = (canvas_w - w) // 2
    for dx in range(-stroke, stroke + 1):
        for dy in range(-stroke, stroke + 1):
            if dx == 0 and dy == 0:
                continue
            if dx * dx + dy * dy <= stroke * stroke:
                draw.text((x + dx, y + dy), text, font=font, fill=outline)
    draw.text((x, y), text, font=font, fill=fill)
    return h


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size, top)
    overlay = Image.new("RGB", size, bottom)
    mask = Image.linear_gradient("L").resize((w, h))
    return Image.composite(overlay, base, mask)


def add_grain(img: Image.Image, amount: int = 12) -> Image.Image:
    noise = Image.effect_noise(img.size, amount).convert("L")
    noise_rgb = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img, noise_rgb, 0.04)


def shade_ceiling(photo: Image.Image, band: float = 0.16) -> Image.Image:
    """Escurece só o teto/reflexo no topo da foto, longe dos rostos."""
    w, h = photo.size
    shade_h = max(int(h * band), 1)
    veil = Image.new("RGBA", (w, shade_h), (0, 0, 0, 0))
    px = veil.load()
    for y in range(shade_h):
        alpha = int(140 * (1 - y / max(shade_h - 1, 1)))
        for x in range(w):
            px[x, y] = (0, 0, 0, alpha)
    rgba = photo.convert("RGBA")
    rgba.alpha_composite(veil, (0, 0))
    return rgba.convert("RGB")


def prepare_photo(path: Path) -> Image.Image:
    photo = Image.open(path).convert("RGB")
    photo = ImageEnhance.Contrast(photo).enhance(1.07)
    photo = ImageEnhance.Color(photo).enhance(1.05)
    photo = ImageEnhance.Sharpness(photo).enhance(1.1)
    return shade_ceiling(photo)


def fit_width(photo: Image.Image, width: int) -> Image.Image:
    ratio = width / photo.width
    return photo.resize((width, max(1, int(photo.height * ratio))), Image.Resampling.LANCZOS)


def fit_box(photo: Image.Image, max_w: int, max_h: int) -> Image.Image:
    ratio = min(max_w / photo.width, max_h / photo.height)
    return photo.resize(
        (max(1, int(photo.width * ratio)), max(1, int(photo.height * ratio))),
        Image.Resampling.LANCZOS,
    )


def frame_photo(photo: Image.Image, border: int = 4) -> Image.Image:
    w, h = photo.size
    canvas = Image.new("RGB", (w + border * 2, h + border * 2), RED)
    canvas.paste(photo, (border, border))
    return canvas


def draw_corner_marks(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    length: int = 26,
    thickness: int = 3,
    color: tuple[int, int, int] = GOLD,
) -> None:
    x0, y0, x1, y1 = box
    for x, y, dx, dy in (
        (x0, y0, 1, 1),
        (x1, y0, -1, 1),
        (x0, y1, 1, -1),
        (x1, y1, -1, -1),
    ):
        draw.line([(x, y), (x + dx * length, y)], fill=color, width=thickness)
        draw.line([(x, y), (x, y + dy * length)], fill=color, width=thickness)


def info_chip(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    value: str,
    title_font: ImageFont.FreeTypeFont,
    value_font: ImageFont.FreeTypeFont,
) -> None:
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=16, fill=CHARCOAL, outline=RED, width=3)
    tw, th = text_wh(title_font, title)
    vw, vh = text_wh(value_font, value)
    cx = (x0 + x1) // 2
    gap = 6
    block = th + gap + vh
    ty = y0 + (y1 - y0 - block) // 2
    draw.text((cx - tw // 2, ty), title, font=title_font, fill=RED)
    draw.text((cx - vw // 2, ty + th + gap), value, font=value_font, fill=WHITE)


def divider(draw: ImageDraw.ImageDraw, y: int, canvas_w: int, width: int = 72) -> None:
    draw.rectangle((canvas_w // 2 - width // 2, y, canvas_w // 2 + width // 2, y + 5), fill=RED)


def eyebrow_row(draw: ImageDraw.ImageDraw, text: str, y: int, font: ImageFont.FreeTypeFont, canvas_w: int) -> None:
    w = text_width(font, text, tracking=10)
    x = (canvas_w - w) // 2
    draw_text(draw, (x, y), text, font, MUTED, tracking=10)
    line_y = y + text_wh(font, text)[1] // 2 + 2
    gap = 18
    draw.rectangle((x - 70, line_y, x - gap, line_y + 2), fill=RED)
    draw.rectangle((x + w + gap, line_y, x + w + 70, line_y + 2), fill=RED)


def render_story() -> Image.Image:
    W, H = 1080, 1920
    canvas = add_grain(vertical_gradient((W, H), (12, 12, 14), (6, 6, 8)))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, W, 8), fill=RED)
    draw.rectangle((0, H - 8, W, H), fill=RED)

    eyebrow = load_font("Oswald-SemiBold.ttf", 26)
    title = load_font("Anton-Regular.ttf", 158)
    subtitle = load_font("Oswald-Bold.ttf", 34)
    com = load_font("Oswald-SemiBold.ttf", 32)
    name = load_font("Anton-Regular.ttf", 92)
    chip_title = load_font("Oswald-SemiBold.ttf", 24)
    chip_value = load_font("Anton-Regular.ttf", 48)

    eyebrow_row(draw, "TREINO ESPECIAL", 56, eyebrow, W)
    draw_outlined_centered(draw, "AULÃO", 108, title, WHITE, RED_DEEP, W, stroke=2)
    divider(draw, 286, W, 80)
    draw_centered(draw, "MMA  ·  STRIKING  ·  GRAPPLING", 310, subtitle, GOLD, W)

    photo = frame_photo(fit_box(prepare_photo(SRC), 980, 820), border=5)
    px = (W - photo.width) // 2
    py = 400
    canvas.paste(photo, (px, py))
    draw_corner_marks(draw, (px - 10, py - 10, px + photo.width + 10, py + photo.height + 10))

    footer = py + photo.height + 56
    draw_centered(draw, "COM O", footer, com, MUTED, W, tracking=12)
    draw_centered(draw, "LENNON", footer + 40, name, WHITE, W)

    chip_w, chip_h = 420, 138
    gap = 32
    total = chip_w * 2 + gap
    left = (W - total) // 2
    cy = footer + 168
    info_chip(draw, (left, cy, left + chip_w, cy + chip_h), "SÁBADO", "19/09", chip_title, chip_value)
    info_chip(
        draw,
        (left + chip_w + gap, cy, left + chip_w + gap + chip_w, cy + chip_h),
        "HORÁRIO",
        "13H ÀS 16H",
        chip_title,
        chip_value,
    )
    return canvas


def render_feed() -> Image.Image:
    W, H = 1080, 1350
    canvas = add_grain(vertical_gradient((W, H), (12, 12, 14), (6, 6, 8)))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, W, 8), fill=RED)
    draw.rectangle((0, H - 8, W, H), fill=RED)

    eyebrow = load_font("Oswald-SemiBold.ttf", 22)
    title = load_font("Anton-Regular.ttf", 110)
    subtitle = load_font("Oswald-Bold.ttf", 28)
    name = load_font("Anton-Regular.ttf", 64)
    meta = load_font("Oswald-SemiBold.ttf", 28)

    eyebrow_row(draw, "TREINO ESPECIAL", 28, eyebrow, W)
    draw_outlined_centered(draw, "AULÃO", 68, title, WHITE, RED_DEEP, W, stroke=2)
    divider(draw, 192, W, 64)
    draw_centered(draw, "MMA  ·  STRIKING  ·  GRAPPLING", 210, subtitle, GOLD, W)

    photo = frame_photo(fit_box(prepare_photo(SRC), 1000, 780), border=4)
    px = (W - photo.width) // 2
    py = 270
    canvas.paste(photo, (px, py))

    footer = py + photo.height + 28
    draw_centered(draw, "COM O LENNON", footer, name, WHITE, W)
    draw_centered(draw, "SÁBADO 19/09   ·   13H ÀS 16H", footer + 78, meta, GOLD, W, tracking=2)
    return canvas


def render_square() -> Image.Image:
    W, H = 1080, 1080
    canvas = add_grain(vertical_gradient((W, H), (12, 12, 14), (6, 6, 8)))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, W, 8), fill=RED)
    draw.rectangle((0, H - 8, W, H), fill=RED)

    title = load_font("Anton-Regular.ttf", 84)
    subtitle = load_font("Oswald-Bold.ttf", 24)
    name = load_font("Anton-Regular.ttf", 46)
    meta = load_font("Oswald-SemiBold.ttf", 24)

    draw_outlined_centered(draw, "AULÃO", 22, title, WHITE, RED_DEEP, W, stroke=2)
    draw_centered(draw, "MMA  ·  STRIKING  ·  GRAPPLING", 112, subtitle, GOLD, W)

    photo = frame_photo(fit_box(prepare_photo(SRC), 980, 740), border=4)
    px = (W - photo.width) // 2
    py = 160
    canvas.paste(photo, (px, py))

    y = py + photo.height + 22
    draw_centered(draw, "COM O LENNON", y, name, WHITE, W)
    draw_centered(draw, "SÁBADO 19/09   ·   13H ÀS 16H", y + 54, meta, GOLD, W)
    return canvas


def render_horizontal() -> Image.Image:
    W, H = 1920, 1080
    canvas = add_grain(vertical_gradient((W, H), (12, 12, 14), (6, 6, 8)))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 10, H), fill=RED)
    draw.rectangle((W - 10, 0, W, H), fill=RED)

    photo = frame_photo(fit_box(prepare_photo(SRC), 1120, 960), border=5)
    canvas.paste(photo, (W - photo.width - 56, (H - photo.height) // 2))

    title = load_font("Anton-Regular.ttf", 128)
    subtitle = load_font("Oswald-Bold.ttf", 28)
    com = load_font("Oswald-SemiBold.ttf", 28)
    name = load_font("Anton-Regular.ttf", 76)
    chip_title = load_font("Oswald-SemiBold.ttf", 22)
    chip_value = load_font("Anton-Regular.ttf", 42)
    eyebrow = load_font("Oswald-SemiBold.ttf", 22)

    x = 72
    draw_text(draw, (x, 96), "TREINO ESPECIAL", eyebrow, MUTED, tracking=8)
    # outlined title, left aligned
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if dx or dy:
                draw.text((x + dx, 150 + dy), "AULÃO", font=title, fill=RED_DEEP)
    draw.text((x, 150), "AULÃO", font=title, fill=WHITE)
    draw.rectangle((x, 300, x + 84, 306), fill=RED)
    draw.text((x, 328), "MMA  ·  STRIKING  ·  GRAPPLING", font=subtitle, fill=GOLD)
    draw.text((x, 420), "COM O", font=com, fill=MUTED)
    draw.text((x, 456), "LENNON", font=name, fill=WHITE)

    info_chip(draw, (x, 610, x + 280, 748), "SÁBADO", "19/09", chip_title, chip_value)
    info_chip(draw, (x + 304, 610, x + 640, 748), "HORÁRIO", "13H ÀS 16H", chip_title, chip_value)
    return canvas


def save(img: Image.Image, stem: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    png = OUT / f"{stem}.png"
    jpg = OUT / f"{stem}.jpg"
    img.save(png, "PNG", optimize=True)
    img.convert("RGB").save(jpg, "JPEG", quality=93, optimize=True, subsampling=1)
    print(f"saved {png.name} {img.size}")


def main() -> None:
    save(render_story(), "aulao-mma-stories")
    save(render_feed(), "aulao-mma-feed")
    save(render_square(), "aulao-mma-quadrado")
    save(render_horizontal(), "aulao-mma-horizontal")


if __name__ == "__main__":
    main()
