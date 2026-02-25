#!/usr/bin/env python3
"""
Generate Open Graph and social media images from a logo SVG or text.
Produces correctly sized images for Facebook, Twitter/X, LinkedIn, and general use.

Requirements: pip install cairosvg Pillow
"""

import argparse
import sys
from pathlib import Path

try:
    import cairosvg
except ImportError:
    print("Error: cairosvg is required. Install with: pip install cairosvg")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

import io

# Social media image specs: (filename, width, height, description)
SOCIAL_SPECS = [
    ("og-image.png", 1200, 630, "Facebook / LinkedIn / WhatsApp"),
    ("twitter-image.png", 1200, 675, "Twitter/X summary_large_image"),
    ("og-square.png", 1200, 1200, "Square (Instagram, fallback)"),
]


def svg_to_pil(svg_path: Path, width: int, height: int) -> Image.Image:
    """Convert SVG to PIL Image at specified dimensions."""
    png_bytes = cairosvg.svg2png(
        bytestring=svg_path.read_bytes(),
        output_width=width,
        output_height=height,
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def create_social_image(
    size: tuple,
    bg_color: str = "#FFFFFF",
    logo_svg: Path = None,
    text: str = None,
    text_color: str = "#000000",
):
    """Create a social media image with logo and/or text centered."""
    width, height = size
    img = Image.new("RGB", (width, height), bg_color)

    if logo_svg and logo_svg.exists():
        # Size logo to ~40% of the shorter dimension, centered
        logo_max = int(min(width, height) * 0.4)
        logo_img = svg_to_pil(logo_svg, logo_max, logo_max)

        if text:
            # Logo above text
            logo_y = int(height * 0.2)
        else:
            # Logo centered
            logo_y = (height - logo_max) // 2

        logo_x = (width - logo_max) // 2
        img.paste(logo_img, (logo_x, logo_y), logo_img)

    if text:
        draw = ImageDraw.Draw(img)
        # Try to find a good font
        font_size = int(min(width, height) * 0.06)
        font = None
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSText.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        for fp in font_paths:
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except (OSError, IOError):
                continue
        if font is None:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (width - tw) // 2
        ty = int(height * 0.65) if logo_svg else (height - th) // 2
        draw.text((tx, ty), text, fill=text_color, font=font)

    return img


def generate_og_images(
    output_dir: str,
    logo_svg: str = None,
    text: str = None,
    bg_color: str = "#FFFFFF",
    text_color: str = "#000000",
):
    """Generate all social media image variants."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    logo_path = Path(logo_svg) if logo_svg else None
    generated = []

    for filename, width, height, desc in SOCIAL_SPECS:
        out_path = output_dir / filename
        img = create_social_image(
            (width, height),
            bg_color=bg_color,
            logo_svg=logo_path,
            text=text,
            text_color=text_color,
        )
        img.save(out_path, "PNG", optimize=True)
        generated.append(str(out_path))
        print(f"  {filename} ({width}x{height}) — {desc}")

    return generated


def generate_meta_tags():
    """Return HTML meta tags for OG images."""
    return """<!-- Open Graph / Facebook / LinkedIn -->
<meta property="og:image" content="/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="[Product name and tagline]">

<!-- Twitter/X -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/twitter-image.png">
<meta name="twitter:image:alt" content="[Product name and tagline]">"""


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate social media / Open Graph images",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_og_images.py ./social/ --logo logo-mark.svg --text "MyApp" --bg "#4F46E5" --text-color "#FFFFFF"
  python generate_og_images.py ./social/ --logo logo-full.svg
  python generate_og_images.py ./social/ --text "Welcome to MyApp"
""",
    )
    parser.add_argument("output_dir", help="Output directory")
    parser.add_argument("--logo", help="Path to logo SVG file")
    parser.add_argument("--text", help="Text to overlay (e.g., product name + tagline)")
    parser.add_argument("--bg", default="#FFFFFF", help="Background color (default: #FFFFFF)")
    parser.add_argument("--text-color", default="#000000", help="Text color (default: #000000)")

    args = parser.parse_args()

    if not args.logo and not args.text:
        parser.error("At least one of --logo or --text is required")

    print("Generating social media images...")
    files = generate_og_images(
        args.output_dir,
        logo_svg=args.logo,
        text=args.text,
        bg_color=args.bg,
        text_color=args.text_color,
    )
    print(f"\nGenerated {len(files)} files in {args.output_dir}/")
    print("\nHTML meta tags:\n")
    print(generate_meta_tags())
