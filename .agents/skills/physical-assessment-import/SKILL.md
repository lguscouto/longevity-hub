---
name: physical-assessment-import
description: >-
  Importa uma nova avaliação física (fotos corporais e relatório de bioimpedância
  Fitdays) a partir de uma pasta local para o banco de dados e página
  #physical-assessments. Use quando o usuário pedir para adicionar, cadastrar ou
  importar uma nova avaliação física com fotos.
---

# Importação de Avaliação Física (Fotos + Fitdays)

Procedimento padronizado para cadastrar uma nova avaliação física no projeto Longevidade (`#physical-assessments`).

## 1. Inspeção das Imagens da Pasta

1. Liste os arquivos da pasta informada pelo usuário.
2. Utilize `read_file` para visualizar todas as imagens da pasta (normalmente 6 fotos corporais + 1 captura longa do app **Fitdays**).
   - **Suporte a `.heic`:** Caso as fotos corporais estejam no formato `.heic`, converta-as previamente para `.jpg` de alta qualidade em uma pasta temporária (ex.: scratch) via `ffmpeg -y -i foto.heic -q:v 2 foto.jpg` (o `ffmpeg` resolve a rotação EXIF/display matrix automaticamente). Em seguida, inspecione e importe os arquivos `.jpg` gerados.
3. Identifique na imagem do **Fitdays**:
   - Data e hora no cabeçalho (`HH:MM DD/MM/YYYY`) — se o usuário especificar outra data de referência no prompt, priorize a data pedida pelo usuário para `assessment_date` e `title`, mantendo o timestamp real ou a data de referência na nota.
   - `weight_kg` (Peso) e `body_fat_percentage` (Gordura corporal %).
   - Todos os 14 indicadores da tabela principal e os 5 pares da seção **Limb Dados** (análise segmentar).

## 2. Mapeamento Padronizado de Fotos (`display_order` 0 a 6)

Para garantir compatibilidade com o comparador lado a lado (`/api/physical-assessments/compare`), classifique as 7 imagens exatamente nesta ordem:

| `display_order` | `angle` | `body_state` | `description` | Critério Visual |
| :---: | :--- | :--- | :--- | :--- |
| `0` | `front` | `relaxed` | `Frente - Relaxado` | De frente, braços relaxados ao longo do corpo |
| `1` | `back` | `relaxed` | `Costas - Relaxado` | De costas, braços relaxados ao longo do corpo |
| `2` | `left_side` | `relaxed` | `Perfil Esquerdo - Relaxado` | Lado esquerdo voltado para a câmera (olhando para a **direita** da foto) |
| `3` | `right_side` | `relaxed` | `Perfil Direito - Relaxado` | Lado direito voltado para a câmera (olhando para a **esquerda** da foto) |
| `4` | `back` | `flexed` | `Costas - Contraído (Duplo Bíceps)` | De costas, pose de duplo bíceps |
| `5` | `front` | `flexed` | `Frente - Contraído (Duplo Bíceps)` | De frente, pose de duplo bíceps |
| `6` | `other` | `unspecified` | `Relatório Bioimpedância Fitdays (DD/MM/YYYY)` | Captura vertical do aplicativo Fitdays |

## 3. Template do Campo `notes` e Metadados

- **`assessment_date`:** `"YYYY-MM-DD"`
- **`title`:** `"DD.MM.YYYY"`
- **`notes`:**

```text
Bioimpedância Fitdays (DD/MM/YYYY HH:MM):
- Peso: <val> kg (<status>)
- Gordura Corporal: <val>% (<status>)
- IMC: <val> (<status>)
- Taxa Muscular: <val>% (<status>)
- Massa Livre de Gordura: <val> kg
- Gordura Subcutânea: <val>% (<status>)
- Gordura Visceral: <val> (<status>)
- Água Corporal: <val>% (<status>)
- Massa Musc. Esquelética: <val>% (<status>)
- Massa Muscular: <val> kg (<status>)
- Massa Óssea: <val> kg (<status>)
- Proteína: <val>% (<status>)
- TMB: <val> kcal (<status>)
- Idade Metabólica: <val> (<status>)
Segmentar:
- Braço E: Gordura <val>% | M. Muscular <val> kg
- Braço D: Gordura <val>% | M. Muscular <val> kg
- Tronco: Gordura <val>% | M. Muscular <val> kg
- Perna E: Gordura <val>% | M. Muscular <val> kg
- Perna D: Gordura <val>% | M. Muscular <val> kg
```

## 4. Execução Segura (Atenção ao Encoding no Windows PowerShell)

> **IMPORTANTE:** Nunca passe strings literais acentuadas diretamente em `python -c "..."` no PowerShell, pois o console converte caracteres UTF-8 em mojibake (`CP850`/`Windows-1252`). Use escapes Unicode (`\uXXXX`) ou grave/execute um script UTF-8.

Execute com o Python da `.venv` (`e:\hermes\longevidade\.venv\Scripts\python.exe`):

1. Instancie `service = _service()` de `backend.app.routers.physical_assessments`.
2. Verifique se já existe avaliação na mesma `assessment_date` para evitar duplicatas.
3. Crie a avaliação com `service.create_assessment(...)` e salve cada foto com `service.save_photo(...)` respeitando `display_order`.
4. Sincronize `daily_metrics`:
   ```python
   with service.repo._get_connection() as conn:
       conn.execute(
           "UPDATE daily_metrics SET body_fat_pct = ? WHERE date_ref = ? AND body_fat_pct IS NULL",
           (body_fat_pct, assessment_date),
       )
       conn.execute(
           "UPDATE daily_metrics SET weight_kg = ? WHERE date_ref = ? AND weight_kg IS NULL",
           (weight_kg, assessment_date),
       )
       conn.execute(
           "UPDATE daily_metrics SET bmi = ? WHERE date_ref = ? AND bmi IS NULL",
           (bmi, assessment_date),
       )
       conn.commit()
   ```

## 5. Verificação

1. Verifique via Python se `ascii(assessment["notes"])` e `ascii(photo["description"])` contêm os codepoints UTF-8 corretos (`\xe2`, `\xe9`, `\xed`, etc.).
2. Se o servidor local (`http://127.0.0.1:8887`) estiver ativo, consulte `GET /api/physical-assessments?limit=1` para confirmar o retorno.
