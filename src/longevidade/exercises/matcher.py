"""Motor de pareamento e resolução de nomes de exercícios físicos entre Português e Inglês,
com tradução ontológica de termos de academia e links para CDN do exercises-dataset.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

JSDELIVR_CDN_BASE = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@master"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/master"

# Dicionário de tradução PT -> EN para grupos musculares e termos anatômicos
BODY_PARTS_PT: Dict[str, str] = {
    "chest": "Peitoral",
    "back": "Costas",
    "shoulders": "Ombros",
    "upper arms": "Braços",
    "lower arms": "Antebraços",
    "upper legs": "Coxas / Pernas",
    "lower legs": "Panturrilhas",
    "waist": "Abdômen e Core",
    "cardio": "Cardio",
    "neck": "Pescoço",
}

TARGET_MUSCLES_PT: Dict[str, str] = {
    "abs": "Abdômen",
    "abductors": "Abdutores",
    "adductors": "Adutores",
    "biceps": "Bíceps",
    "calves": "Panturrilhas",
    "cardiovascular system": "Sistema Cardiovascular",
    "delts": "Deltoides (Ombro)",
    "forearms": "Antebraços",
    "glutes": "Glúteos",
    "hamstrings": "Isquiotibiais (Posterior de Coxa)",
    "lats": "Grande Dorsal (Costas)",
    "levator scapulae": "Levantador da Escápula",
    "pectorals": "Peitoral Maior",
    "quads": "Quadríceps",
    "serratus anterior": "Serrátil Anterior",
    "spine": "Eretores da Espinha",
    "traps": "Trapézio",
    "triceps": "Tríceps",
    "upper back": "Costas Superior",
    "obliques": "Oblíquos",
}

EQUIPMENT_PT: Dict[str, str] = {
    "assisted": "Assistido / Gravitron",
    "band": "Elástico / Faixa",
    "barbell": "Barra",
    "body weight": "Peso Corporal",
    "bosu ball": "Bosu",
    "cable": "Cabo / Polia",
    "dumbbell": "Halteres",
    "elliptical machine": "Elíptico",
    "ez barbell": "Barra W / EZ",
    "hammer": "Martelo / Alavanca",
    "kettlebell": "Kettlebell",
    "leverage machine": "Máquina de Alavanca",
    "medicine ball": "Medicine Ball",
    "olympic barbell": "Barra Olímpica",
    "resistance band": "Elástico",
    "roller": "Rolo de Liberação",
    "rope": "Corda",
    "skierg machine": "SkiErg",
    "sled machine": "Leg Press / Trenó",
    "smith machine": "Máquina Smith",
    "stability ball": "Bola Suíça",
    "stationary bike": "Bicicleta Ergométrica",
    "stepmill machine": "Simulador de Escada",
    "tire": "Pneu",
    "trap bar": "Barra Hexagonal",
    "upper body ergometer": "Ergômetro Superior",
    "weighted": "Com Carga Adicional",
    "wheel roller": "Roda Abdominal",
}

# Expressões e sinônimos PT -> EN para busca e matching
PT_TO_EN_TERMS: Dict[str, str] = {
    "aberturas invertidas de ombro posterior": "reverse fly",
    "crucifixo invertido": "reverse fly",
    "crucifixo no voador": "butterfly",
    "crucifixo": "fly",
    "voador": "butterfly",
    "peck deck": "butterfly",
    "supino reto": "bench press",
    "supino inclinado": "incline chest press",
    "supino declinado": "decline chest press",
    "supino sentado": "seated chest press",
    "supino": "bench press",
    "agachamento no smith": "smith squat",
    "agachamento livre": "squat",
    "agachamento": "squat",
    "cadeira extensora": "leg extension",
    "cadeira flexora": "seated leg curl",
    "mesa flexora": "lying leg curl",
    "cadeira abdutora": "seated hip abduction",
    "cadeira adutora": "seated hip adduction",
    "elevacao lateral": "lateral raise",
    "elevacao frontal": "front raise",
    "elevacao de panturrilha sentado": "seated calf raise",
    "elevacao de panturrilha em pe": "standing calf raise",
    "elevacao de panturrilha": "calf raise",
    "panturrilha em pe": "standing calf raise",
    "panturrilha sentado": "seated calf raise",
    "panturrilha": "calf raise",
    "desenvolvimento": "shoulder press",
    "extensao de triceps acima da cabeca": "overhead triceps extension",
    "extensao de triceps na polia": "cable triceps pushdown",
    "extensao de triceps": "triceps extension",
    "triceps na polia com corda": "cable pushdown rope",
    "triceps na polia": "cable pushdown",
    "triceps corda": "cable pushdown rope",
    "triceps testa": "lying triceps extension",
    "triceps frances": "overhead triceps extension",
    "triceps": "triceps",
    "rosca direta na polia": "cable bicep curl",
    "rosca direta": "bicep curl",
    "rosca scott": "preacher curl",
    "rosca martelo": "hammer curl",
    "rosca alternada": "alternate bicep curl",
    "rosca concentrada": "concentration curl",
    "rosca": "curl",
    "puxada alta na polia": "lat pulldown",
    "puxada alta": "lat pulldown",
    "puxada frontal": "lat pulldown",
    "puxada": "pulldown",
    "remada curvada": "bent over row",
    "remada sentada com barra": "seated cable row",
    "remada sentada": "seated row",
    "remada baixa": "seated cable row",
    "remadas dobradas": "bent over row",
    "remada": "row",
    "leg press 45": "leg press",
    "leg press horizontal": "horizontal leg press",
    "leg press": "leg press",
    "prancha abdominal": "front plank",
    "prancha": "plank",
    "abdominal na maquina": "lever crunch",
    "abdominal": "crunch",
    "esteira": "treadmill",
    "bicicleta": "bicycling",
    "stiff": "stiff leg deadlift",
    "levantamento terra": "deadlift",
    # Equipamentos
    "halter": "dumbbell",
    "halteres": "dumbbell",
    "barra": "barbell",
    "maquina": "lever",
    "cabo": "cable",
    "polia": "cable",
    "smith": "smith",
    "corda": "rope",
    "sentado": "seated",
    "em pe": "standing",
    "deitado": "lying",
    "inclinado": "incline",
    "declinado": "decline",
}


def normalize_string(text: str) -> str:
    """Normaliza texto removendo acentos, caracteres especiais e espaços extras."""
    if not text:
        return ""
    # Remove acentos
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    # Mantém letras, números e espaços
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text).lower()
    return " ".join(text.split())


def build_media_urls(image_path: Optional[str], gif_path: Optional[str]) -> Dict[str, Optional[str]]:
    """Gera as URLs CDN (jsDelivr e fallback GitHub Raw) para imagens e GIFs."""
    res: Dict[str, Optional[str]] = {
        "image_url": None,
        "image_fallback": None,
        "gif_url": None,
        "gif_fallback": None,
    }
    if image_path:
        clean_img = image_path.lstrip("/")
        res["image_url"] = f"{JSDELIVR_CDN_BASE}/{clean_img}"
        res["image_fallback"] = f"{GITHUB_RAW_BASE}/{clean_img}"
    if gif_path:
        clean_gif = gif_path.lstrip("/")
        res["gif_url"] = f"{JSDELIVR_CDN_BASE}/{clean_gif}"
        res["gif_fallback"] = f"{GITHUB_RAW_BASE}/{clean_gif}"
    return res


def translate_pt_to_en(normalized_title: str) -> str:
    """Traduz termos comuns de musculação em português para seus equivalentes em inglês."""
    translated = normalized_title
    for pt, en in sorted(PT_TO_EN_TERMS.items(), key=lambda x: -len(x[0])):
        translated = re.sub(r"\b" + re.escape(pt) + r"\b", en, translated)
    return " ".join(translated.split())


def match_exercise_title(
    title: str,
    catalog_items: List[Dict[str, Any]],
) -> Tuple[Optional[str], float]:
    """
    Encontra o exercício mais compatível no catálogo com base no título em português ou inglês.
    Retorna (catalog_id, score).
    """
    if not title or not catalog_items:
        return None, 0.0

    norm_title = normalize_string(title)
    translated_title = translate_pt_to_en(norm_title)
    trans_words = set(translated_title.split())

    best_id: Optional[str] = None
    best_score: float = 0.0

    for item in catalog_items:
        c_id = str(item["id"])
        c_name = item.get("name", "")
        norm_c_name = normalize_string(c_name)

        # 1. Match exato
        if norm_c_name == translated_title or norm_c_name == norm_title:
            return c_id, 1.0

        c_words = set(norm_c_name.split())
        inter = trans_words.intersection(c_words)
        if not inter:
            continue

        # Jaccard score
        score = len(inter) / (len(trans_words) + len(c_words) - len(inter))

        # Bônus para substring exata
        if translated_title in norm_c_name or norm_c_name in translated_title:
            score += 0.4

        # Bônus se equipamento principal bater
        item_eq = normalize_string(item.get("equipment", ""))
        for eq_term in ["dumbbell", "barbell", "cable", "lever", "smith"]:
            if eq_term in trans_words and eq_term in item_eq:
                score += 0.2

        if score > best_score:
            best_score = score
            best_id = c_id

    # Aceitamos matches com score razoável (> 0.20)
    if best_score >= 0.20:
        return best_id, min(best_score, 1.0)

    return None, 0.0
