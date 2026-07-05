"""
uv venv --python 3.13
uv pip install Pillow
uv run python ./make_koishi_badge_logo.py
"""

from __future__ import annotations

import argparse
import base64
import io
from pathlib import Path
from urllib.parse import quote

from PIL import Image


BADGE_URL = "https://img.shields.io/badge/Koishi-plugin-5546A3?style=flat-square"
BADGE_LINK = "https://koishi.chat/"


def trim_transparent(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    return image.crop(bbox) if bbox else image


def convert_logo(
    image_path: Path,
    white_threshold: int,
    edge_width: int,
    size: int,
    compress_level: int = 5,
) -> bytes:
    image = Image.open(image_path).convert("RGBA")
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            # Distance from pure white. White background becomes transparent;
            # anti-aliased light-purple edges become semi-transparent white.
            distance = max(255 - r, 255 - g, 255 - b)

            if distance <= white_threshold:
                pixels[x, y] = (255, 255, 255, 0)
                continue

            alpha = 255
            if distance < white_threshold + edge_width:
                alpha = int(255 * (distance - white_threshold) / edge_width)

            pixels[x, y] = (255, 255, 255, min(alpha, a))

    image = trim_transparent(image)
    image.thumbnail((size, size), Image.Resampling.LANCZOS)

    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True, compress_level=compress_level)
    return output.getvalue()


def build_badge_markdown(png_bytes: bytes) -> str:
    logo_data = "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")
    logo_param = quote(logo_data, safe="")
    badge = f"{BADGE_URL}&logo={logo_param}"
    return f"[![Koishi]({badge})]({BADGE_LINK})"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Koishi logo purple->white, white->transparent, then print a Shields badge markdown.",
    )
    parser.add_argument(
        "image",
        nargs="?",
        default="koishi.js.logo.png",
        help="Input logo image path. Defaults to koishi.js.logo.png in current directory.",
    )
    parser.add_argument(
        "--white-threshold",
        type=int,
        default=10,
        help="Pixels within this distance from white become fully transparent.",
    )
    parser.add_argument(
        "--edge-width",
        type=int,
        default=80,
        help="Soft edge width for anti-aliased pixels.",
    )
    parser.add_argument(
        "--save",
        default="",
        help="Optional path to save the converted transparent white logo.",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=30,
        help="Maximum logo size in pixels. Shields logos are small, default is 30.",
    )
    parser.add_argument(
        "--compress-level",
        type=int,
        default=5,
        help="PNG compress level 0-9. Default is 5.",
    )
    parser.add_argument(
        "--md-path",
        default="",
        help="Optional path to save the badge markdown to a file.",
    )

    args = parser.parse_args()
    image_path = Path(args.image)
    png_bytes = convert_logo(
        image_path,
        args.white_threshold,
        args.edge_width,
        args.size,
        args.compress_level,
    )

    if args.save:
        Path(args.save).write_bytes(png_bytes)

    md = build_badge_markdown(png_bytes)
    if args.md_path:
        Path(args.md_path).write_text(md + "\n")
        print(f"Saved badge markdown to {args.md_path}")
    else:
        print(md)


if __name__ == "__main__":
    main()
