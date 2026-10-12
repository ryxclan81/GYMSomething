from pathlib import Path
from PIL import Image, ImageDraw

project = Path(__file__).resolve().parents[1]
root = project / 'public' / 'icons'
root.mkdir(parents=True, exist_ok=True)


def icon(size):
    image = Image.new('RGB', (size, size), '#0c1310')
    draw = ImageDraw.Draw(image)
    scale = size / 512
    draw.rounded_rectangle((int(80*scale), int(80*scale), int(432*scale), int(432*scale)), radius=int(84*scale), fill='#1e3027')
    # Same original vector geometry as SetwiseMark, safely inside maskable bounds.
    mark = [(27, 3), (10, 3), (4, 9), (4, 15), (22, 21), (22, 24),
            (4, 24), (4, 30), (22, 30), (28, 24), (28, 18),
            (10, 12), (10, 9), (27, 9)]
    points = [(int((128 + x*8)*scale), int((120 + y*8)*scale)) for x, y in mark]
    draw.polygon(points, fill='#c0dfc5')
    return image


for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (512, 'maskable-512.png'), (180, 'apple-touch-icon.png')]:
    icon(size).save(root / name)

assets = project / 'ios' / 'App' / 'App' / 'Assets.xcassets'
if assets.exists():
    icon(1024).save(assets / 'AppIcon.appiconset' / 'AppIcon-512@2x.png')
    splash = Image.new('RGB', (2732, 2732), '#0c1310')
    splash.paste(icon(512), ((2732 - 512) // 2, (2732 - 512) // 2))
    for filename in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
        splash.save(assets / 'Splash.imageset' / filename)
