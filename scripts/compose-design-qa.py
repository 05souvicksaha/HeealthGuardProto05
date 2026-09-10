from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


PROJECT = Path(__file__).resolve().parents[1]
QA = PROJECT / "artifacts" / "qa"
REVIEW = PROJECT.parents[1] / ".tmp-review"


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)


triptych = REVIEW / "Gemini_Generated_Image_x0i5z8x0i5z8x0i5-review.jpg"
rows = [
    ("LANDING", triptych, QA / "landing-desktop.png", (0.00, 0.00, 0.34, 1.00), (0.00, 0.00, 1.00, 0.58)),
    ("LOGIN", triptych, QA / "login-desktop.png", (0.34, 0.00, 0.66, 1.00), (0.00, 0.00, 1.00, 1.00)),
    ("PROFILE", triptych, QA / "profile-setup-desktop.png", (0.66, 0.00, 1.00, 1.00), (0.00, 0.00, 1.00, 0.66)),
    ("DASHBOARD LIGHT", REVIEW / "Gemini_Generated_Image_9zrqbl9zrqbl9zrq-review.jpg", QA / "dashboard-desktop.png", (0.00, 0.00, 1.00, 1.00), (0.00, 0.00, 1.00, 0.72)),
    ("DASHBOARD DARK", REVIEW / "Gemini_Generated_Image_drncwzdrncwzdrnc-review.jpg", QA / "dashboard-dark.png", (0.00, 0.00, 1.00, 1.00), (0.00, 0.00, 1.00, 0.72)),
]

panel = (800, 450)
header = 54
gap = 18
canvas = Image.new("RGB", (panel[0] * 2 + gap * 3, (panel[1] + header + gap) * len(rows) + gap), "#07111f")
draw = ImageDraw.Draw(canvas)
font = ImageFont.load_default(size=20)
small = ImageFont.load_default(size=15)

for index, (name, source_path, implementation_path, source_box, implementation_box) in enumerate(rows):
    y = gap + index * (panel[1] + header + gap)
    source = Image.open(source_path).convert("RGB")
    implementation = Image.open(implementation_path).convert("RGB")
    source = source.crop(tuple(int(value * dimension) for value, dimension in zip(source_box, (source.width, source.height, source.width, source.height))))
    implementation = implementation.crop(tuple(int(value * dimension) for value, dimension in zip(implementation_box, (implementation.width, implementation.height, implementation.width, implementation.height))))
    source_panel = cover(source, panel)
    implementation_panel = cover(implementation, panel)
    left = gap
    right = panel[0] + gap * 2
    draw.text((left, y), f"{name} — SOURCE REFERENCE", fill="#9feaf0", font=font)
    draw.text((right, y), f"{name} — HEALTHGUARD IMPLEMENTATION", fill="#9feaf0", font=font)
    draw.text((left, y + 29), "Visual direction reference; interface content is intentionally HealthGuard-specific.", fill="#9eb1c7", font=small)
    canvas.paste(source_panel, (left, y + header))
    canvas.paste(implementation_panel, (right, y + header))

QA.mkdir(parents=True, exist_ok=True)
canvas.save(QA / "design-comparison-sheet.png", quality=94)
