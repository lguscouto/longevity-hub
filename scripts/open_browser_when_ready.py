"""Utilitario para aguardar a inicializacao do servidor e abrir o navegador.

Executado em segundo plano pelo run_app.bat para evitar abrir o navegador
antes que a aplicacao FastAPI esteja pronta para responder.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import urllib.error
import urllib.request
import webbrowser


def is_server_ready(health_url: str, fallback_url: str = "") -> bool:
    """Verifica se o servidor esta respondendo com status HTTP valido."""
    urls_to_check = [health_url]
    if fallback_url and fallback_url != health_url:
        urls_to_check.append(fallback_url)

    for url in urls_to_check:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Longevidade-Startup-Probe/1.0"},
            )
            with urllib.request.urlopen(req, timeout=1.0) as response:
                if 200 <= response.status < 400:
                    return True
        except urllib.error.HTTPError as exc:
            # Qualquer resposta HTTP (mesmo 4xx) significa que o servidor esta ativo
            if exc.code < 500:
                return True
        except (urllib.error.URLError, TimeoutError, OSError):
            pass
        except Exception:
            pass
    return False


def open_url(url: str) -> bool:
    """Abre a URL no navegador padrao do sistema."""
    try:
        if webbrowser.open(url):
            return True
    except Exception:
        pass

    # Fallback no Windows usando comando start
    if sys.platform == "win32":
        try:
            os.system(f'start "" "{url}"')
            return True
        except Exception:
            pass
    return False


def wait_and_open(
    target_url: str = "http://127.0.0.1:8887",
    health_url: str = "http://127.0.0.1:8887/api/health",
    timeout: float = 60.0,
    interval: float = 0.5,
) -> bool:
    """Aguarda o servidor responder e abre o navegador."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_server_ready(health_url, fallback_url=target_url):
            print(f"[INFO] Servidor pronto! Abrindo o navegador em {target_url}...", flush=True)
            open_url(target_url)
            return True
        time.sleep(interval)

    print(
        f"[AVISO] Tempo limite de {timeout:.0f}s atingido aguardando o servidor. "
        f"Abra manualmente: {target_url}",
        flush=True,
    )
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Aguarda o servidor iniciar e abre o navegador."
    )
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8887",
        help="URL final para abrir no navegador",
    )
    parser.add_argument(
        "--health-url",
        default="",
        help="URL de health check (padrao: <url>/api/health)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=60.0,
        help="Tempo limite em segundos (padrao: 60)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.5,
        help="Intervalo de sondagem em segundos (padrao: 0.5)",
    )
    args = parser.parse_args()

    health_url = args.health_url or f"{args.url.rstrip('/')}/api/health"
    success = wait_and_open(
        target_url=args.url,
        health_url=health_url,
        timeout=args.timeout,
        interval=args.interval,
    )
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
