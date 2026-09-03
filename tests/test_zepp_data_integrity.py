"""
Testes de integridade de dados, persistência atômica, mesclagem e segurança para o módulo Zepp.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

# Adiciona o diretório de scripts do Zepp ao sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
ZEPP_SCRIPTS_DIR = BASE_DIR / "integrations" / "zepp" / "scripts"
ZEPP_CLI_DIR = BASE_DIR / "integrations" / "zepp" / "zepp-health-cli"

if str(ZEPP_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_SCRIPTS_DIR))
if str(ZEPP_CLI_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_CLI_DIR))

from storage_utils import (
    atomic_write_json,
    is_valid_payload,
    merge_health_payload,
    safe_load_json,
)
import fetch_zepp_data as fetch_mod
from zepp_health import ZeppClient


class ZeppDataIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_is_valid_payload(self):
        self.assertTrue(is_valid_payload({"items": [1, 2, 3]}))
        self.assertTrue(is_valid_payload({"data": {"summary": []}}))
        self.assertFalse(is_valid_payload({"error": "API returned 500"}))
        self.assertFalse(is_valid_payload({"error": "Unauthorized", "returncode": 1}))
        self.assertFalse(is_valid_payload("string"))
        self.assertFalse(is_valid_payload(None))
        self.assertFalse(is_valid_payload([1, 2, 3]))

    def test_atomic_write_success_and_cleanup(self):
        target = self.data_dir / "test_file.json"
        data = {"status": "ok", "value": 42}

        atomic_write_json(target, data)

        self.assertTrue(target.is_file())
        loaded = json.loads(target.read_text(encoding="utf-8"))
        self.assertEqual(loaded, data)

        # Garante que nenhum arquivo temporário residual foi deixado
        tmp_files = list(self.data_dir.glob("*.tmp"))
        self.assertEqual(len(tmp_files), 0)

    def test_atomic_write_preserves_on_failure(self):
        target = self.data_dir / "target.json"
        initial_data = {"preserved": True}
        atomic_write_json(target, initial_data)

        with patch("json.dump", side_effect=IOError("Simulated disk error")):
            with self.assertRaises(IOError):
                atomic_write_json(target, {"corrupted": True})

        # Arquivo original deve permanecer intacto
        self.assertEqual(safe_load_json(target), initial_data)

        # Arquivo temporário deve ser limpo
        tmp_files = list(self.data_dir.glob("*.tmp"))
        self.assertEqual(len(tmp_files), 0)

    def test_never_overwrite_valid_data_on_error(self):
        with patch.object(fetch_mod, "DATA_DIR", self.data_dir):
            file_name = "heart_rate.json"
            target = self.data_dir / file_name
            valid_existing = {"items": [{"value": 72, "timestamp": 1700000000}]}
            atomic_write_json(target, valid_existing)

            # Tentativa de salvar um payload que contém erro
            error_payload = {"error": "HTTP 500 Internal Server Error", "returncode": 1}
            ok, err = fetch_mod.save_json(error_payload, file_name)

            self.assertFalse(ok)
            self.assertIn("500", str(err))

            # O arquivo original DEVE permanecer com os 72 bpm
            persisted = safe_load_json(target)
            self.assertEqual(persisted, valid_existing)

    def test_merge_health_payload_items(self):
        existing = {
            "items": [
                {"timestamp": 100, "value": 60},
                {"timestamp": 200, "value": 65},
            ]
        }
        new_data = {
            "items": [
                {"timestamp": 200, "value": 66},  # atualizado
                {"timestamp": 300, "value": 70},  # novo
            ]
        }
        merged = merge_health_payload(existing, new_data)
        self.assertEqual(len(merged["items"]), 3)
        timestamps = [it["timestamp"] for it in merged["items"]]
        self.assertEqual(sorted(timestamps), [100, 200, 300])

    def test_merge_health_payload_band_data(self):
        existing = {
            "data": [
                {"date_time": "2026-08-28", "summary": "old_b64"},
                {"date_time": "2026-08-29", "summary": "b64_29"},
            ]
        }
        new_data = {
            "data": [
                {"date_time": "2026-08-29", "summary": "updated_b64_29"},
                {"date_time": "2026-08-30", "summary": "b64_30"},
            ]
        }
        merged = merge_health_payload(existing, new_data)
        self.assertEqual(len(merged["data"]), 3)
        dates = [d["date_time"] for d in merged["data"]]
        self.assertEqual(sorted(dates), ["2026-08-28", "2026-08-29", "2026-08-30"])

    def test_merge_health_payload_workouts(self):
        existing = {
            "data": {
                "summary": [
                    {"trackid": "1001", "run_time": 1800},
                    {"trackid": "1002", "run_time": 2400},
                ]
            }
        }
        new_data = {
            "data": {
                "summary": [
                    {"trackid": "1002", "run_time": 2450},
                    {"trackid": "1003", "run_time": 3600},
                ]
            }
        }
        merged = merge_health_payload(existing, new_data)
        summaries = merged["data"]["summary"]
        self.assertEqual(len(summaries), 3)
        track_ids = [str(s["trackid"]) for s in summaries]
        self.assertEqual(sorted(track_ids), ["1001", "1002", "1003"])

    def test_calculate_incremental_days_without_history(self):
        meta_file = self.data_dir / "metadata.json"
        days = fetch_mod.calculate_incremental_days(meta_file, default_full=365, overlap_days=2)
        self.assertEqual(days, 365)

    def test_calculate_incremental_days_with_recent_sync(self):
        meta_file = self.data_dir / "metadata.json"
        one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        atomic_write_json(meta_file, {"fetched_at": one_day_ago, "status": "SUCCESS"})

        days = fetch_mod.calculate_incremental_days(meta_file, default_full=365, overlap_days=2)
        # 1 dia decorrido + 2 overlap = 3 dias
        self.assertEqual(days, 3)

    def test_calculate_incremental_days_with_older_sync(self):
        meta_file = self.data_dir / "metadata.json"
        five_days_ago = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        atomic_write_json(meta_file, {"fetched_at": five_days_ago, "status": "SUCCESS"})

        days = fetch_mod.calculate_incremental_days(meta_file, default_full=365, overlap_days=2)
        # 5 dias decorridos + 2 overlap = 7 dias
        self.assertEqual(days, 7)

    def test_zepp_client_ssrf_host_allowlist(self):
        # Hosts autorizados devem instanciar normalmente
        client = ZeppClient(
            apptoken="test_token",
            user_id="test_user",
            host="api-mifit-us3.zepp.com",
        )
        self.assertEqual(client.base, "https://api-mifit-us3.zepp.com")

        # Host não autorizado deve lançar ValueError
        disallowed_hosts = [
            "evil.example.com",
            "169.254.169.254",
            "localhost",
            "internal.corp",
        ]
        for bad_host in disallowed_hosts:
            with self.assertRaises(ValueError) as ctx:
                ZeppClient(apptoken="token", user_id="123", host=bad_host)
            self.assertIn("Host Zepp não autorizado", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
