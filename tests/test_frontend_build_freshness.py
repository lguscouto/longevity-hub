from pathlib import Path
import shutil
import subprocess

import pytest


def test_frontend_fingerprint_detects_source_and_lock_changes(tmp_path: Path):
    node = shutil.which('node')
    if not node:
        pytest.skip('Node.js não disponível')
    project = Path(__file__).resolve().parents[1]
    root = tmp_path / 'frontend'
    (root / 'scripts').mkdir(parents=True)
    (root / 'src').mkdir()
    (root / 'dist').mkdir()
    (root / 'dist' / 'assets').mkdir()
    (root / 'dist' / 'assets' / 'app.js').write_text('bundle', encoding='utf-8')
    (root / 'dist' / 'index.html').write_text('<script src="/assets/app.js"></script>', encoding='utf-8')
    script = root / 'scripts' / 'build-freshness.mjs'
    shutil.copyfile(project / 'frontend' / 'scripts' / script.name, script)
    (root / 'src' / 'app.ts').write_text('original', encoding='utf-8')
    (root / 'package-lock.json').write_text('{}', encoding='utf-8')

    def run(*args):
        return subprocess.run([node, str(script), *args], capture_output=True, text=True).returncode

    assert run() == 1
    assert run('--write') == 0
    assert run() == 0
    (root / 'dist' / 'assets' / 'app.js').unlink()
    assert run() == 1
    (root / 'dist' / 'assets' / 'app.js').write_text('bundle', encoding='utf-8')
    assert run() == 0
    (root / 'src' / 'app.ts').write_text('alterado', encoding='utf-8')
    assert run() == 1
    assert run('--write') == 0
    (root / 'package-lock.json').write_text('{"version":2}', encoding='utf-8')
    assert run() == 1
