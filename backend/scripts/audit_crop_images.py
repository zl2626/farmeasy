"""Render numbered contact sheets for manual crop image verification."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--images-dir", type=Path)
    args = parser.parse_args()
    frontend = Path(__file__).resolve().parents[2] / "farmeasy-frontend"
    mapping = json.loads((frontend / "src/data/cropImages.json").read_text(encoding="utf-8"))
    if args.images_dir:
        mapping = {name: relative for name, relative in mapping.items() if (args.images_dir / Path(relative).name).exists()}
    args.output.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 19)
    entries = list(mapping.items())
    for start in range(0, len(entries), 25):
        sheet = Image.new("RGB", (1250, 1000), "white")
        draw = ImageDraw.Draw(sheet)
        for i, (name, relative) in enumerate(entries[start:start + 25]):
            x, y = (i % 5) * 250, (i // 5) * 200
            path = args.images_dir / Path(relative).name if args.images_dir else frontend / "public" / relative.lstrip("/")
            try:
                with Image.open(path) as source:
                    image = ImageOps.contain(ImageOps.exif_transpose(source).convert("RGB"), (244, 166))
                    sheet.paste(image, (x + (244 - image.width) // 2, y))
            except (OSError, ValueError) as exc:
                draw.text((x + 5, y + 60), type(exc).__name__, font=font, fill="red")
            draw.text((x + 5, y + 170), f"{start + i + 1}. {name}", font=font, fill="black")
        output = args.output / f"crops-{start // 25 + 1}.jpg"
        sheet.save(output, quality=92)
        print(output)


if __name__ == "__main__":
    main()
