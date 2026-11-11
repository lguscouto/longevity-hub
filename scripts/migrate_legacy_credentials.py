"""Copia credenciais legadas para o cofre sem alterar os arquivos de origem."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import keyring


def migrate(provider: str, path: Path, apply: bool = False) -> str:
    if not path.is_file():
        return "Arquivo legado não encontrado."
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("O arquivo legado deve conter um objeto JSON.")
    if provider == "google":
        from longevidade.integrations.google_health.client import GoogleHealthCredentials
        import hashlib
        service = "longevidade-google-health"
        account = hashlib.sha256(str(path.resolve()).encode()).hexdigest()
        migrate_data = lambda: GoogleHealthCredentials.from_file(path).save_to_file(path)
    elif provider == "zepp":
        service, account = "longevidade.integrations", "zepp_config"
        if not data.get("app_token") or not data.get("user_id"):
            raise ValueError("Arquivo Zepp sem app_token ou user_id.")
        migrate_data = lambda: keyring.set_password(service, account, json.dumps(data))
    else:
        service, account = "longevidade.integrations", "hevy_api_key"
        if not data.get("api_key"):
            raise ValueError("Arquivo Hevy sem api_key.")
        migrate_data = lambda: keyring.set_password(service, account, str(data["api_key"]))
    if keyring.get_password(service, account) is not None:
        return "Já existe uma entrada no cofre; nenhuma alteração realizada."
    if not apply:
        return "Arquivo elegível; execute com --apply para copiar ao cofre."
    migrate_data()
    return "Credencial copiada ao cofre. Arquivo legado preservado."


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("provider", choices=("google", "zepp", "hevy"))
    parser.add_argument("path", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(migrate(args.provider, args.path, args.apply))


if __name__ == "__main__":
    main()
