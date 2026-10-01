from __future__ import annotations

import io
import sys
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pytest

from scripts.open_browser_when_ready import (
    is_server_ready,
    main,
    open_url,
    wait_and_open,
)


def test_is_server_ready_success_200():
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.__enter__.return_value = mock_response

    with patch("urllib.request.urlopen", return_value=mock_response):
        assert is_server_ready("http://127.0.0.1:8887/api/health") is True


def test_is_server_ready_fallback_success():
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.__enter__.return_value = mock_response

    def side_effect(req, timeout=1.0):
        if req.full_url == "http://127.0.0.1:8887/api/health":
            raise urllib.error.URLError("Connection refused")
        return mock_response

    with patch("urllib.request.urlopen", side_effect=side_effect):
        assert (
            is_server_ready(
                "http://127.0.0.1:8887/api/health",
                fallback_url="http://127.0.0.1:8887",
            )
            is True
        )


def test_is_server_ready_http_error_404():
    # Qualquer resposta HTTP (mesmo 404) indica que o processo uvicorn/fastapi esta de pe
    err = urllib.error.HTTPError(
        url="http://127.0.0.1:8887/api/health",
        code=404,
        msg="Not Found",
        hdrs=MagicMock(),
        fp=io.BytesIO(b""),
    )
    with patch("urllib.request.urlopen", side_effect=err):
        assert is_server_ready("http://127.0.0.1:8887/api/health") is True


def test_is_server_ready_connection_refused():
    err = urllib.error.URLError("Connection refused")
    with patch("urllib.request.urlopen", side_effect=err):
        assert is_server_ready("http://127.0.0.1:8887/api/health") is False


def test_open_url_webbrowser_success():
    with patch("webbrowser.open", return_value=True) as mock_open:
        assert open_url("http://127.0.0.1:8887") is True
        mock_open.assert_called_once_with("http://127.0.0.1:8887")


def test_open_url_windows_fallback():
    with patch("webbrowser.open", return_value=False), \
         patch("sys.platform", "win32"), \
         patch("os.system", return_value=0) as mock_os_system:
        assert open_url("http://127.0.0.1:8887") is True
        mock_os_system.assert_called_once_with('start "" "http://127.0.0.1:8887"')


def test_wait_and_open_success():
    with patch("scripts.open_browser_when_ready.is_server_ready", side_effect=[False, True]), \
         patch("scripts.open_browser_when_ready.open_url", return_value=True) as mock_open, \
         patch("time.sleep", return_value=None):
        result = wait_and_open(
            target_url="http://127.0.0.1:8887",
            health_url="http://127.0.0.1:8887/api/health",
            timeout=5.0,
            interval=0.01,
        )
        assert result is True
        mock_open.assert_called_once_with("http://127.0.0.1:8887")


def test_wait_and_open_timeout():
    with patch("scripts.open_browser_when_ready.is_server_ready", return_value=False), \
         patch("scripts.open_browser_when_ready.open_url") as mock_open, \
         patch("time.sleep", return_value=None):
        result = wait_and_open(
            target_url="http://127.0.0.1:8887",
            health_url="http://127.0.0.1:8887/api/health",
            timeout=0.05,
            interval=0.01,
        )
        assert result is False
        mock_open.assert_not_called()


def test_main_cli():
    with patch("sys.argv", ["open_browser_when_ready.py", "--url", "http://127.0.0.1:8887", "--timeout", "1"]), \
         patch("scripts.open_browser_when_ready.wait_and_open", return_value=True) as mock_wait:
        ret = main()
        assert ret == 0
        mock_wait.assert_called_once_with(
            target_url="http://127.0.0.1:8887",
            health_url="http://127.0.0.1:8887/api/health",
            timeout=1.0,
            interval=0.5,
        )
