"""
Testes unitários para normalização de métricas do Zepp:
- Fuso horário local
- Duração e contagem de treinos por data de referência
- Temperatura da pele calibrada
- Body battery inicial e final
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent.parent
ZEPP_SCRIPTS_DIR = BASE_DIR / "integrations" / "zepp" / "scripts"
if str(ZEPP_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_SCRIPTS_DIR))

from health_metrics import (
    APP_TIMEZONE,
    _body_battery_values,
    _day_from_timestamp,
    _select_band_values,
    _temperature_values,
    _workout_values,
    build_zepp_daily_record,
    get_workout_duration_seconds,
)
from storage_utils import atomic_write_json


class ZeppNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_timezone_conversion_near_utc_midnight(self):
        # 2026-08-31 01:30 UTC -> 2026-08-30 22:30 em America/Sao_Paulo (-03:00)
        dt_utc = datetime(2026, 8, 31, 1, 30, tzinfo=timezone.utc)
        ts = dt_utc.timestamp()

        local_day = _day_from_timestamp(ts, tz=ZoneInfo("America/Sao_Paulo"))
        self.assertEqual(local_day, date(2026, 8, 30))

    def test_workout_duration_extraction_keys(self):
        self.assertEqual(get_workout_duration_seconds({"run_time": 1800}), 1800)
        self.assertEqual(get_workout_duration_seconds({"duration": 2400}), 2400)
        self.assertEqual(get_workout_duration_seconds({"durationTime": 3600}), 3600)
        self.assertEqual(get_workout_duration_seconds({"totalTime": 1200}), 1200)
        self.assertEqual(get_workout_duration_seconds({"duration_min": 45}), 2700.0)
        self.assertIsNone(get_workout_duration_seconds({}))

    def test_workouts_filtered_by_reference_date(self):
        # Timestamps para 2026-08-01 10:00, 2026-08-01 16:00, e 2026-08-02 09:00 em America/Sao_Paulo
        ts_day1_a = datetime(2026, 8, 1, 10, 0, tzinfo=APP_TIMEZONE).timestamp()
        ts_day1_b = datetime(2026, 8, 1, 16, 0, tzinfo=APP_TIMEZONE).timestamp()
        ts_day2 = datetime(2026, 8, 2, 9, 0, tzinfo=APP_TIMEZONE).timestamp()

        payload = {
            "data": {
                "summary": [
                    {"trackid": str(int(ts_day1_a)), "run_time": 1800},  # 30 min
                    {"trackid": str(int(ts_day1_b)), "duration": 2400},  # 40 min
                    {"trackid": str(int(ts_day2)), "totalTime": 3600},   # 60 min
                ]
            }
        }

        # Dia 1: 2 treinos, 70 min total
        count_d1, dur_d1 = _workout_values(payload, date(2026, 8, 1), tz=APP_TIMEZONE)
        self.assertEqual(count_d1, 2)
        self.assertEqual(dur_d1, 70.0)

        # Dia 2: 1 treino, 60 min total
        count_d2, dur_d2 = _workout_values(payload, date(2026, 8, 2), tz=APP_TIMEZONE)
        self.assertEqual(count_d2, 1)
        self.assertEqual(dur_d2, 60.0)

        # Dia 3: 0 treinos
        count_d3, dur_d3 = _workout_values(payload, date(2026, 8, 3), tz=APP_TIMEZONE)
        self.assertEqual(count_d3, 0)
        self.assertIsNone(dur_d3)

    def test_temperature_values_calibration_and_sentinels(self):
        ref = date(2026, 8, 1)
        ts_base = datetime(2026, 8, 1, 8, 0, tzinfo=APP_TIMEZONE).timestamp()

        # Caso válido: 15 centésimos = 0.15°C
        payload_valid = {
            "items": [
                {
                    "timestamp": ts_base,
                    "value": {
                        "skinTempCalibrated": 15,
                        "skinTempScore": 88,
                    },
                }
            ]
        }
        delta_c, score = _temperature_values(payload_valid, ref)
        self.assertEqual(delta_c, 0.15)
        self.assertEqual(score, 88)

        # Sentinela 32767 descartada
        payload_sentinel = {
            "items": [
                {
                    "timestamp": ts_base,
                    "value": {
                        "skinTempCalibrated": 32767,
                        "skinTempScore": 0,
                    },
                }
            ]
        }
        delta_c_inv, score_inv = _temperature_values(payload_sentinel, ref)
        self.assertIsNone(delta_c_inv)
        self.assertIsNone(score_inv)

    def test_body_battery_initial_and_final(self):
        ref = date(2026, 8, 1)
        ts_base = datetime(2026, 8, 1, 0, 0, tzinfo=APP_TIMEZONE).timestamp()
        payload = {
            "items": [
                {"timestamp": ts_base + 3600 * 6, "value": {"value": 85}},   # 06:00 -> 85
                {"timestamp": ts_base + 3600 * 12, "value": {"value": 60}},  # 12:00 -> 60
                {"timestamp": ts_base + 3600 * 22, "value": {"value": 30}},  # 22:00 -> 30
            ]
        }
        init_bb, final_bb = _body_battery_values(payload, ref)
        self.assertEqual(init_bb, 85)
        self.assertEqual(final_bb, 30)

    def test_active_calories_extraction(self):
        import base64
        import json

        ref = date(2026, 8, 1)
        summary = {
            "stp": {"ttl": 10500, "cal": 650},
            "slp": {"dp": 60, "lt": 180, "dt": 80, "wk": 10},
        }
        b64 = base64.b64encode(json.dumps(summary).encode()).decode()
        payload = {"data": [{"date_time": "2026-08-01", "summary": b64}]}

        steps, cals, sleep_min, dp, lt, dt, wk = _select_band_values(payload, ref)
        self.assertEqual(steps, 10500)
        self.assertEqual(cals, 650)
        self.assertEqual(sleep_min, 320)


if __name__ == "__main__":
    unittest.main()
