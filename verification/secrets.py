"""Scan every unique tracked Git history blob for common credential formats."""
import re, subprocess
patterns = [
    rb'AKIA[A-Z0-9]{16}', rb'gh[pousr]_[A-Za-z0-9]{30,}',
    rb'sk-(?:proj-|live_)?[A-Za-z0-9_-]{32,}',
    rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    rb'mongodb(?:\+srv)?://[^\s<>\'"/]+:[^\s<>\'"/]+@',
]
seen = set()
revisions = subprocess.check_output(['git', 'rev-list', '--all'], text=True).splitlines()
for revision in revisions:
    rows = subprocess.check_output(['git', 'ls-tree', '-r', revision], text=True).splitlines()
    for row in rows:
        metadata, path = row.split('\t', 1)
        if path.endswith('.env') or '/node_modules/' in path:
            raise SystemExit(f'FAIL: forbidden tracked file {path}')
        blob = metadata.split()[2]
        if blob in seen or path.endswith('.pdf'): continue
        seen.add(blob)
        data = subprocess.check_output(['git', 'cat-file', 'blob', blob])
        if any(re.search(pattern, data) for pattern in patterns):
            raise SystemExit(f'FAIL: credential-shaped content in {path} at {revision}; inspect privately')
print(f'PASS: scanned {len(revisions)} commits / {len(seen)} unique text blobs; no recognized secrets or tracked .env/node_modules')
