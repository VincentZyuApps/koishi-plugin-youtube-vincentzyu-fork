```bash
uv venv --python 3.13
uv pip install Pillow
uv run python make_koishi_badge_logo.py koishi.js.logo.png --size 50 --compress-level 1 --md-path shield.io.logo.test.md
```