#!/usr/bin/env python3
"""
Generate brand identity assets from SVG source files.
Converts SVG logos to PNG at standard sizes, generates favicons (ICO),
and creates app icons for iOS/Android.

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
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

import io

# Asset specifications: (filename, width, height, category)
ASSET_SPECS = {
    "favicons": [
        ("favicon-16x16.png", 16, 16),
        ("favicon-32x32.png", 32, 32),
        ("favicon-48x48.png", 48, 48),
        ("favicon-96x96.png", 96, 96),
    ],
    "app-icons": [
        ("apple-touch-icon-120x120.png", 120, 120),
        ("apple-touch-icon-152x152.png", 152, 152),
        ("apple-touch-icon-180x180.png", 180, 180),
        ("android-chrome-192x192.png", 192, 192),
        ("android-chrome-512x512.png", 512, 512),
    ],
    "general": [
        ("logo-64.png", 64, 64),
        ("logo-128.png", 128, 128),
        ("logo-256.png", 256, 256),
        ("logo-512.png", 512, 512),
        ("logo-1024.png", 1024, 1024),
    ],
}


def svg_to_png(svg_path: Path, width: int, height: int) -> bytes:
    """Convert SVG to PNG bytes at specified dimensions."""
    svg_content = svg_path.read_bytes()
    return cairosvg.svg2png(
        bytestring=svg_content,
        output_width=width,
        output_height=height,
    )


def generate_ico(svg_path: Path, output_path: Path):
    """Generate .ico file with multiple sizes from SVG."""
    sizes = [(16, 16), (32, 32), (48, 48)]
    images = []
    for w, h in sizes:
        png_bytes = svg_to_png(svg_path, w, h)
        img = Image.open(io.BytesIO(png_bytes))
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        images.append(img)

    images[0].save(
        output_path,
        format="ICO",
        sizes=[(img.width, img.height) for img in images],
        append_images=images[1:],
    )


def generate_assets(svg_path: str, output_dir: str, categories: str = "all"):
    """Generate all asset variants from a source SVG."""
    svg_path = Path(svg_path)
    output_dir = Path(output_dir)

    if not svg_path.exists():
        print(f"Error: SVG file not found: {svg_path}")
        sys.exit(1)

    if not svg_path.suffix.lower() == ".svg":
        print(f"Error: Source must be an SVG file, got: {svg_path.suffix}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine which categories to generate
    if categories == "all":
        cats = list(ASSET_SPECS.keys())
    else:
        cats = [c.strip() for c in categories.split(",")]

    generated = []
    for cat in cats:
        if cat not in ASSET_SPECS:
            print(f"Warning: Unknown category '{cat}', skipping.")
            continue

        cat_dir = output_dir / cat
        cat_dir.mkdir(parents=True, exist_ok=True)

        for filename, width, height in ASSET_SPECS[cat]:
            out_path = cat_dir / filename
            try:
                png_bytes = svg_to_png(svg_path, width, height)
                out_path.write_bytes(png_bytes)
                generated.append(str(out_path))
                print(f"  {filename} ({width}x{height})")
            except Exception as e:
                print(f"  ERROR generating {filename}: {e}")

    # Generate .ico file
    if "favicons" in cats:
        ico_path = output_dir / "favicons" / "favicon.ico"
        try:
            generate_ico(svg_path, ico_path)
            generated.append(str(ico_path))
            print(f"  favicon.ico (16x16, 32x32, 48x48)")
        except Exception as e:
            print(f"  ERROR generating favicon.ico: {e}")

    return generated


def generate_html_tags():
    """Return HTML link/meta tags for generated assets."""
    return """<!-- Favicons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">

<!-- App Icons -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">"""


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate brand assets from SVG source",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_assets.py logo-mark.svg ./brand-assets/
  python generate_assets.py logo-mark.svg ./brand-assets/ --categories favicons,app-icons
""",
    )
    parser.add_argument("svg_source", help="Path to source SVG file")
    parser.add_argument("output_dir", help="Output directory for generated assets")
    parser.add_argument(
        "--categories",
        default="all",
        help="Comma-separated categories: favicons, app-icons, general, or all (default: all)",
    )
    parser.add_argument(
        "--html-tags",
        action="store_true",
        help="Print HTML tags for including assets",
    )

    args = parser.parse_args()

    print(f"Generating assets from {args.svg_source}...")
    files = generate_assets(args.svg_source, args.output_dir, args.categories)
    print(f"\nGenerated {len(files)} files in {args.output_dir}/")

    if args.html_tags:
        print("\nHTML tags:\n")
        print(generate_html_tags())
