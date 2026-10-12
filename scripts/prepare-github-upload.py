"""Prepare reviewed source for GitHub Git Data API upload, excluding local records/caches."""
from pathlib import Path
import base64
import hashlib
import json
import sys

project = Path(__file__).resolve().parents[1]
manifest_path = project / 'artifacts' / 'github-upload.json'

if len(sys.argv) > 1:
    records = json.loads(manifest_path.read_text(encoding='utf-8'))
    if sys.argv[1] == 'index':
        print(json.dumps([{k: v for k, v in record.items() if k != 'content'} for record in records]))
    else:
        record = records[int(sys.argv[1])]
        offset = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        size = int(sys.argv[3]) if len(sys.argv) > 3 else 50000
        print(json.dumps({'content': record['content'][offset:offset+size]}))
    sys.exit(0)

excluded = {'node_modules', 'dist', 'Pods', 'build', 'output', 'DerivedData',
            'xcuserdata', '__pycache__', '.DS_Store', '.git', 'capacitor-cordova-ios-plugins'}
root_files = [item for item in project.iterdir() if item.is_file() and
              (item.suffix in {'.md', '.json', '.ts', '.js', '.yaml', '.html'} or item.name in {'.gitignore', '.env.example'})]
files = root_files + [item for name in ['src', 'public', 'scripts', 'tests', 'ios', '.github', 'docs']
                      for item in (project / name).rglob('*') if item.is_file()]
records = []
for item in sorted(set(files)):
    relative = item.relative_to(project)
    if any(part in excluded for part in relative.parts) or relative.as_posix().startswith('ios/App/App/public/'):
        continue
    if relative.as_posix() in {'ios/App/App/capacitor.config.json', 'ios/App/App/config.xml'}:
        continue
    if item.name in {'.env', '.env.local'} or item.suffix == '.tsbuildinfo':
        continue
    content = item.read_bytes()
    try:
        text = content.decode('utf-8')
        encoding = 'utf-8'
    except UnicodeDecodeError:
        text = base64.b64encode(content).decode('ascii')
        encoding = 'base64'
    records.append({'path': relative.as_posix(), 'encoding': encoding, 'bytes': len(content),
                    'length': len(text), 'sha256': hashlib.sha256(content).hexdigest(), 'content': text})
manifest_path.parent.mkdir(exist_ok=True)
manifest_path.write_text(json.dumps(records), encoding='utf-8')
print(json.dumps({'files': len(records), 'bytes': sum(record['bytes'] for record in records),
                  'largest': sorted([{key: record[key] for key in ['path', 'bytes']} for record in records],
                                    key=lambda record: record['bytes'], reverse=True)[:8]}))
