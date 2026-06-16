"""Generate a small set of synthetic overhead 'drone camera frames' so the AI
pipeline is functional out of the box. Replace these with real satellite/aerial
screenshots (any .png/.jpg dropped into demo-imagery/) for the live demo."""
import os
import random

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "demo-imagery")
os.makedirs(OUT, exist_ok=True)

W, H = 720, 540
TERRAIN = [(196, 174, 137), (172, 156, 122), (150, 140, 110), (120, 130, 96)]


def base(seed: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    random.seed(seed)
    img = Image.new("RGB", (W, H), random.choice(TERRAIN))
    d = ImageDraw.Draw(img)
    # scatter terrain mottling
    for _ in range(180):
        x, y = random.randint(0, W), random.randint(0, H)
        r = random.randint(2, 9)
        c = random.randint(-18, 18)
        base_c = img.getpixel((min(x, W - 1), min(y, H - 1)))
        d.ellipse([x, y, x + r, y + r], fill=tuple(max(0, min(255, v + c)) for v in base_c))
    return img, d


def vehicle(d, x, y, w=34, h=18):
    d.rectangle([x, y, x + w, y + h], fill=(34, 34, 38))
    d.rectangle([x + 4, y + 4, x + w - 4, y + h - 4], fill=(54, 54, 60))


def frame_convoy():
    img, d = base(1)
    d.line([40, 270, 680, 300], fill=(105, 100, 92), width=26)  # dirt road
    for i in range(5):
        vehicle(d, 90 + i * 110, 268 - i * 6)
    img.save(os.path.join(OUT, "frame_convoy_a.png"))


def frame_apron():
    img, d = base(2)
    d.rectangle([120, 120, 600, 420], fill=(96, 99, 104))  # concrete apron
    # a fixed-wing aircraft: fuselage + wings (cross) + tail
    cx, cy = 360, 270
    d.rectangle([cx - 8, cy - 70, cx + 8, cy + 80], fill=(208, 210, 214))  # fuselage
    d.polygon([(cx - 90, cy + 6), (cx + 90, cy + 6), (cx + 8, cy - 14), (cx - 8, cy - 14)], fill=(200, 202, 206))  # wings
    d.rectangle([cx - 34, cy + 70, cx + 34, cy + 84], fill=(196, 198, 202))  # tailplane
    img.save(os.path.join(OUT, "frame_apron_b.png"))


def frame_structures():
    img, d = base(3)
    for _ in range(7):
        x, y = random.randint(80, 560), random.randint(80, 420)
        w, h = random.randint(40, 90), random.randint(40, 80)
        d.rectangle([x, y, x + w, y + h], fill=(150, 146, 140))
        d.rectangle([x + 6, y + h, x + w + 14, y + h + 10], fill=(70, 66, 62))  # shadow
    img.save(os.path.join(OUT, "frame_structures_c.png"))


def frame_empty():
    img, d = base(4)
    d.line([0, 360, W, 300], fill=(120, 132, 100), width=18)  # a wadi / dry riverbed
    img.save(os.path.join(OUT, "frame_empty_d.png"))


def frame_port():
    img, d = base(5)
    d.rectangle([0, 0, W, 230], fill=(40, 78, 104))  # water
    d.rectangle([0, 210, W, 245], fill=(150, 146, 140))  # quay
    for i in range(3):  # ships
        x = 90 + i * 200
        d.rectangle([x, 90 + i * 20, x + 140, 110 + i * 20], fill=(58, 60, 66))
    img.save(os.path.join(OUT, "frame_port_e.png"))


def frame_mixed():
    img, d = base(6)
    d.line([60, 160, 660, 200], fill=(105, 100, 92), width=22)
    for i in range(3):
        vehicle(d, 140 + i * 150, 150 + i * 4)
    for _ in range(3):
        x, y = random.randint(120, 560), random.randint(320, 460)
        d.rectangle([x, y, x + 60, y + 50], fill=(150, 146, 140))
    img.save(os.path.join(OUT, "frame_mixed_f.png"))


if __name__ == "__main__":
    frame_convoy()
    frame_apron()
    frame_structures()
    frame_empty()
    frame_port()
    frame_mixed()
    print("generated frames:", sorted(os.listdir(OUT)))
