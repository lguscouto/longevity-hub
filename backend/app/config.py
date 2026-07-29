from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "longevity.sqlite3"
ZEPP_DATA_DIR = BASE_DIR.parent / "zepp" / "data"
