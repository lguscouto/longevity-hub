#!/usr/bin/env python3
"""
Script interativo para obtenção de autorização OAuth 2.0 na Google Health API v4.

Passos:
1. Solicita ou lê client_id e client_secret do Google Cloud Console.
2. Gera o link de consentimento com os escopos googlehealth.*
3. Recebe o authorization_code e troca por access_token e refresh_token.
4. Salva em google_health_token.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Adiciona caminhos do projeto ao sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from longevidade.ingestion.google_health_client import (
    GOOGLE_HEALTH_SCOPES,
    GOOGLE_OAUTH_TOKEN_URL,
    GoogleHealthCredentials,
    get_default_token_path,
)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
DEFAULT_REDIRECT_URI = "http://127.0.0.1:8887/api/google-health/callback"


def authenticate_interactive(
    client_id: str,
    client_secret: str,
    output_path: Path,
    redirect_uri: str = DEFAULT_REDIRECT_URI,
) -> bool:
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_HEALTH_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    print("=" * 70)
    print("AUTENTICAÇÃO GOOGLE HEALTH API v4 (OAUTH 2.0)")
    print("=" * 70)
    print("\n1. Abra o seguinte link no seu navegador para autorizar o acesso:\n")
    print(auth_url)
    print(f"\n2. Redirecionamento configurado para: {redirect_uri}")
    print("   Faça login com sua conta Google e insira o código de autorização.")
    print("=" * 70)

    try:
        import webbrowser
        webbrowser.open(auth_url)
    except Exception:
        pass

    auth_code = input("\nCole o código de autorização aqui: ").strip()
    if not auth_code:
        print("[ERRO] Código não fornecido.")
        return False

    token_data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    req = Request(
        GOOGLE_OAUTH_TOKEN_URL,
        data=urlencode(token_data).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 3600)
            token_type = data.get("token_type", "Bearer")
            raw_scope = data.get("scope")

            if not access_token:
                print("[ERRO] Resposta do Google não continha access_token.")
                return False

            if raw_scope:
                granted_scopes = [s for s in raw_scope.split() if s]
            else:
                granted_scopes = list(GOOGLE_HEALTH_SCOPES)

            creds = GoogleHealthCredentials(
                client_id=client_id,
                client_secret=client_secret,
                access_token=access_token,
                refresh_token=refresh_token,
                token_uri=GOOGLE_OAUTH_TOKEN_URL,
                token_type=token_type,
                expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                scopes=granted_scopes,
            )

            # P0.1: Obtém o healthUserId via GetIdentity
            from longevidade.ingestion.google_health_client import GoogleHealthClient
            temp_client = GoogleHealthClient(credentials=creds, token_path=output_path)
            id_data, _ = temp_client.get_identity(access_token)
            if id_data and id_data.get("healthUserId"):
                creds.health_user_id = id_data.get("healthUserId")

            creds.save_to_file(output_path)

            scope_status = creds.get_scope_status()
            print(f"\n[SUCESSO] Credenciais salvas com sucesso em:\n{output_path}")
            if creds.health_user_id:
                print(f" - Health User ID: {creds.health_user_id}")
            print("\nStatus dos Escopos Autorizados (Consentimento):")
            print(f" - Atividade Física & Passos: {'[AUTORIZADO]' if scope_status['activity'] else '[NÃO CONCEDIDO]'}")
            print(f" - Métricas Vitais & FC/SpO2/Peso: {'[AUTORIZADO]' if scope_status['health_metrics'] else '[NÃO CONCEDIDO]'}")
            print(f" - Sono & Estágios: {'[AUTORIZADO]' if scope_status['sleep'] else '[NÃO CONCEDIDO]'}")
            return True
    except HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        print(f"\n[ERRO HTTP {err.code}] Falha ao trocar código por token:\n{err_msg}")
        return False
    except Exception as exc:
        print(f"\n[ERRO] Falha na requisição: {exc}")
        return False



def main() -> int:
    parser = argparse.ArgumentParser(description="Autenticação OAuth 2.0 Google Health API")
    parser.add_argument("--client-id", type=str, default=None, help="Google OAuth Client ID")
    parser.add_argument("--client-secret", type=str, default=None, help="Google OAuth Client Secret")
    parser.add_argument("--output", type=str, default=None, help="Caminho do arquivo de saída")
    args = parser.parse_args()

    client_id = args.client_id or os.environ.get("GOOGLE_HEALTH_CLIENT_ID")
    client_secret = args.client_secret or os.environ.get("GOOGLE_HEALTH_CLIENT_SECRET")

    output_path = Path(args.output) if args.output else get_default_token_path()

    if not client_id:
        client_id = input("Informe o Google Client ID: ").strip()
    if not client_secret:
        client_secret = input("Informe o Google Client Secret: ").strip()

    if not client_id or not client_secret:
        print("[ERRO] Client ID e Client Secret são obrigatórios.")
        return 1

    ok = authenticate_interactive(client_id, client_secret, output_path)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
