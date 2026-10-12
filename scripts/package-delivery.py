"""Package the tested web build and source without local caches or test records."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import plistlib
import xml.etree.ElementTree as ET
from PIL import Image

project = Path(__file__).resolve().parents[1]
release = project / 'releases'
release.mkdir(exist_ok=True)

dist = project / 'dist'
native_public = project / 'ios' / 'App' / 'App' / 'public'
assert (dist / 'sw.js').is_file(), 'Build the production application first.'
for item in dist.rglob('*'):
    if item.is_file():
        counterpart = native_public / item.relative_to(dist)
        assert counterpart.is_file() and item.read_bytes() == counterpart.read_bytes(), f'Run ios:sync: {item.name}'

assets = project / 'ios' / 'App' / 'App' / 'Assets.xcassets'
with Image.open(assets / 'AppIcon.appiconset' / 'AppIcon-512@2x.png') as image:
    assert image.size == (1024, 1024) and image.mode == 'RGB'
for item in (assets / 'Splash.imageset').glob('*.png'):
    with Image.open(item) as image:
        assert image.size == (2732, 2732) and image.mode == 'RGB'
with (project / 'ios/App/App/Info.plist').open('rb') as stream:
    info = plistlib.load(stream)
assert info['CFBundleDisplayName'] == 'Setwise' and info['NSCameraUsageDescription']
for item in (project / 'ios').rglob('*.storyboard'):
    ET.parse(item)
for item in (project / 'ios').rglob('Contents.json'):
    json.loads(item.read_text(encoding='utf-8'))

with ZipFile(release / 'setwise-web.zip', 'w', ZIP_DEFLATED) as archive:
    for item in sorted(dist.rglob('*')):
        if item.is_file():
            archive.write(item, item.relative_to(dist).as_posix())

source_roots = ['src', 'public', 'scripts', 'tests', 'ios', '.github', 'docs']
root_files = [item for item in project.iterdir() if item.is_file() and (item.suffix in {'.md', '.json', '.ts', '.js', '.yaml', '.html'} or item.name in {'.gitignore', '.env.example'})]
source_files = root_files + [item for root in source_roots for item in (project / root).rglob('*') if item.is_file()]
source_files += [item for item in (project / 'artifacts' / 'screenshots').glob('*.png')]
source_files += [project / 'artifacts' / 'performance.json', project / 'artifacts' / 'final-test-results' / '.last-run.json']
with ZipFile(release / 'setwise-ios-source.zip', 'w', ZIP_DEFLATED) as archive:
    for item in sorted(source_files):
        relative = item.relative_to(project)
        if any(part in {'Pods', 'build', 'xcuserdata', '__pycache__'} for part in relative.parts):
            continue
        archive.write(item, relative.as_posix())

manifest = {}
for name in ['setwise-web.zip', 'setwise-ios-source.zip']:
    item = release / name
    with ZipFile(item) as archive:
        assert archive.testzip() is None
        count = len(archive.namelist())
    manifest[name] = {'bytes': item.stat().st_size, 'files': count, 'sha256': hashlib.sha256(item.read_bytes()).hexdigest()}
(release / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'native_asset_checks': 'passed', 'packages': manifest}, indent=2))
