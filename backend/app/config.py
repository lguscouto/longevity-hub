from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_DB_PATH = DATA_DIR / "longevity.sqlite3"
DB_PATH = DEFAULT_DB_PATH


INTEGRATIONS_DIR = BASE_DIR / "integrations"

ZEPP_DIR = INTEGRATIONS_DIR / "zepp"
ZEPP_DATA_DIR = ZEPP_DIR / "data"
ZEPP_SCRIPTS_DIR = ZEPP_DIR / "scripts"

GOOGLE_DIR = INTEGRATIONS_DIR / "google"
GOOGLE_DATA_DIR = GOOGLE_DIR / "data"
GOOGLE_SCRIPTS_DIR = GOOGLE_DIR / "scripts"


def get_zepp_data_dir() -> Path:
    ZEPP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    return ZEPP_DATA_DIR


def get_google_data_dir() -> Path:
    GOOGLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    return GOOGLE_DATA_DIR


def get_db_path() -> Path:
    runtime_db = os.getenv("LONGEVIDADE_DB_PATH")
    if runtime_db:
        return Path(runtime_db).expanduser()
    return DEFAULT_DB_PATH
