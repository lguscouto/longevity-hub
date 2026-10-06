# Fase 1: Arquitetura de Dados, Migração de Schema & Agregações de Perfil no Backend

---

## 1. Visão Geral e Objetivos

Esta fase estabelece os alicerces de dados necessários para suportar o novo Perfil de Longevidade no **Longevidade Hub**. 

### Objetivos Principais
1. **Evolução do Schema SQLite**: Estender a tabela `user_profile` através de uma migração versionada idempotente (versão 17) para armazenar dados da Ficha Médica (*Medical ID*), Metas de Longevidade e Arquitetura de Estilo de Vida.
2. **Agregação Fisiológica em Tempo de Execução**: Enriquecer o endpoint `GET /api/profile` para agregar automaticamente dados pré-existentes no banco (`daily_metrics`, `phenoage_records`, `kdm_records`, `supplement_stack`, `protocol_compliance`), sem onerar o banco com queries lentas.
3. **Preservação Rígida do Princípio P0.5 (Não-Ficção Clínica)**: Jamais preencher campos ausentes com defaults clínicos inventados (ex: nunca inventar tipo sanguíneo, nunca assumir alergias vazias como ausentes sem confirmação, manter campos numéricos como `None`/`null` quando não houver registro verificado).

---

## 2. Migração SQLite Versionada (Migração 17)

No arquivo `src/longevidade/db/migrations.py`, o schema atual atinge a versão 16. A versão 17 introduzirá as novas colunas necessárias em `user_profile`:

```python
Migration(
    version=17,
    name="add_clinical_and_lifestyle_to_user_profile",
    statements=(
        # Ficha Médica e Contato de Emergência (Medical ID)
        "ALTER TABLE user_profile ADD COLUMN blood_type TEXT;",
        "ALTER TABLE user_profile ADD COLUMN allergies TEXT;",
        "ALTER TABLE user_profile ADD COLUMN family_history TEXT;",
        "ALTER TABLE user_profile ADD COLUMN chronic_conditions TEXT;",
        "ALTER TABLE user_profile ADD COLUMN emergency_contact_name TEXT;",
        "ALTER TABLE user_profile ADD COLUMN emergency_contact_phone TEXT;",
        "ALTER TABLE user_profile ADD COLUMN primary_physician TEXT;",

        # Identidade de Longevidade e Metas
        "ALTER TABLE user_profile ADD COLUMN longevity_goals TEXT;",  # JSON array serializado: ["cardiovascular", "hypertrophy", "phenoage"]
        "ALTER TABLE user_profile ADD COLUMN protocol_start_date TEXT;",  # YYYY-MM-DD

        # Arquitetura de Estilo de Vida & Hábitos
        "ALTER TABLE user_profile ADD COLUMN fasting_window TEXT;",       # Ex: '16:8 (12:00 - 20:00)'
        "ALTER TABLE user_profile ADD COLUMN chronotype TEXT;",           # Ex: 'Matutino', 'Intermediário', 'Noturno'
        "ALTER TABLE user_profile ADD COLUMN daily_water_target_ml INTEGER;",
        "ALTER TABLE user_profile ADD COLUMN target_sleep_hours REAL;",
        "ALTER TABLE user_profile ADD COLUMN target_body_fat_pct REAL;",
    ),
)
```

### Idempotência e Tratamento de Erros
A função `apply_migrations` já possui tratamento para ignorar `duplicate column name`, assegurando que ambientes de testes ou bancos legados não sofram falhas em caso de reexecução.

---

## 3. Regras de Não-Ficção Clínica (Princípio P0.5)

Em conformidade com a auditoria de integridade do Longevidade Hub:
* Se `blood_type` for `NULL`, a API deve retornar `None` (o frontend exibirá o estado neutro *"Não informado"*).
* Se o usuário nunca realizou exames para cálculo de **PhenoAge** ou **KDM**, a API deve retornar `biological_age: None` e `biological_age_delta: None`.
* O cálculo de IMC (`bmi`) continua exigindo estritamente a presença concomitante de `height_cm > 0` e `current_weight_kg > 0`.
* A **Relação Cintura-Estatura (WHtR)** só deve ser calculada se `waist_cm > 0` e `height_cm > 0`:
  $$\text{WHtR} = \frac{\text{waist\_cm}}{\text{height\_cm}}$$

---

## 4. Métodos do Repositório (`LongevityRepository`)

No arquivo `src/longevidade/db/repository.py`, serão adicionados/ajustados métodos específicos para consolidar o perfil sem poluir a rota HTTP:

### 4.1 `get_user_profile()`
Retorna a linha única de `user_profile` com deserialização segura de campos JSON (`longevity_goals`):

```python
def get_user_profile(self) -> Dict[str, Any]:
    sql = "SELECT * FROM user_profile WHERE id = 1;"
    with self._get_connection() as conn:
        row = conn.execute(sql).fetchone()
        if not row:
            return {}
        data = dict(row)
        if data.get("longevity_goals"):
            try:
                data["longevity_goals"] = json.loads(data["longevity_goals"])
            except Exception:
                data["longevity_goals"] = []
        else:
            data["longevity_goals"] = []
        return data
```

### 4.2 `get_profile_golden_metrics()`
Busca os valores mais recentes dos biomarcadores de ouro em `daily_metrics`:

```python
def get_profile_golden_metrics(self) -> Dict[str, Any]:
    """Retorna os valores mais recentes dos biomarcadores padrão-ouro de longevidade."""
    sql = """
        SELECT 
            date_ref,
            vo2_max,
            rhr_bpm,
            hrv_ms,
            body_fat_pct,
            waist_cm,
            grip_strength_kg,
            respiratory_rate_rpm,
            spo2_avg_pct
        FROM daily_metrics
        ORDER BY date_ref DESC
        LIMIT 1;
    """
    with self._get_connection() as conn:
        row = conn.execute(sql).fetchone()
        return dict(row) if row else {}
```

### 4.3 `get_profile_biological_age_snapshot()`
Extrai o resultado mais recente de PhenoAge ou KDM Age:

```python
def get_profile_biological_age_snapshot(self) -> Optional[Dict[str, Any]]:
    """Recupera o registro mais recente de idade fenotípica (PhenoAge)."""
    sql = """
        SELECT 
            calculated_at,
            chronological_age,
            pheno_age,
            age_delta,
            record_origin
        FROM phenoage_records
        ORDER BY calculated_at DESC, id DESC
        LIMIT 1;
    """
    with self._get_connection() as conn:
        row = conn.execute(sql).fetchone()
        if not row:
            return None
        r = dict(row)
        return {
            "calculated_at": r["calculated_at"],
            "biological_age": round(r["pheno_age"], 1),
            "chronological_age": round(r["chronological_age"], 1),
            "age_delta": round(r["age_delta"], 1),
            "record_origin": r.get("record_origin", "unverified"),
        }
```

### 4.4 `get_active_supplements_count()` e `get_protocol_streak_days()`
* Contagem rápida: `SELECT COUNT(*) FROM supplement_stack WHERE is_active = 1;`
* Cálculo de dias de protocolo: se `protocol_start_date` estiver definido, calcula `(date.today() - start_date).days`.

---

## 5. Modelos Pydantic e Contrato da API (`backend/app/routers/profile.py`)

### 5.1 `UserProfileInput` (Payload de Atualização)

```python
class UserProfileInput(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    birthdate: Optional[str] = None
    chronological_age: Optional[float] = None
    height_cm: Optional[float] = None
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    gender: Optional[str] = None
    
    # Ficha Médica
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_physician: Optional[str] = None
    
    # Metas e Longevidade
    longevity_goals: Optional[List[str]] = None
    protocol_start_date: Optional[str] = None
    
    # Estilo de Vida
    fasting_window: Optional[str] = None
    chronotype: Optional[str] = None
    daily_water_target_ml: Optional[int] = None
    target_sleep_hours: Optional[float] = None
    target_body_fat_pct: Optional[float] = None
```

### 5.2 Contrato de Resposta `GET /api/profile`

A resposta retornará um objeto JSON unificado, dividindo os dados entre cadastrais, ficha médica, estilo de vida e agregados fisiológicos:

```json
{
  "name": "gustavo",
  "email": "gustavo@exemplo.com",
  "birthdate": "1994-03-22",
  "chronological_age": 32.0,
  "height_cm": 170.0,
  "current_weight_kg": 83.9,
  "target_weight_kg": 75.0,
  "bmi": 29.0,
  "gender": "Masculino",
  "avatar_url": null,
  "google_connected": true,
  "source": "Google Health API & Hub Longevidade",

  "protocol": {
    "status": "Protocolo Ativo",
    "phase": "Fase 2: Otimização Mitocondrial",
    "start_date": "2026-05-15",
    "streak_days": 143,
    "longevity_goals": [
      "cardiovascular",
      "hypertrophy",
      "phenoage"
    ]
  },

  "biological_age": {
    "calculated_at": "2026-09-15T10:00:00",
    "biological_age": 29.4,
    "chronological_age": 32.0,
    "age_delta": -2.6,
    "pace_of_aging": 0.88,
    "status": "Otimização Celular Favorável"
  },

  "golden_metrics": {
    "date_ref": "2026-10-04",
    "vo2_max": 44.5,
    "vo2_max_percentile": "Top 20%",
    "rhr_bpm": 54.0,
    "hrv_ms": 58.0,
    "body_fat_pct": 21.4,
    "target_body_fat_pct": 15.0,
    "waist_cm": 88.0,
    "whtr": 0.52,
    "grip_strength_kg": 48.0,
    "spo2_avg_pct": 98.0
  },

  "medical_id": {
    "blood_type": "O+",
    "allergies": "Nenhuma medicamentosa / Lactose (leve)",
    "family_history": "Doença cardiovascular aterosclerótica paterna aos 62a",
    "chronic_conditions": "Nenhuma",
    "emergency_contact": {
      "name": "Juliana",
      "phone": "+55 (11) 98765-4321"
    },
    "primary_physician": "Dr. Roberto Santos (Cardiologista)"
  },

  "lifestyle": {
    "fasting_window": "16:8 (12:00 - 20:00)",
    "chronotype": "Intermediário Matutino",
    "daily_water_target_ml": 3200,
    "target_sleep_hours": 8.0,
    "active_supplements_count": 5
  }
}
```

---

## 6. Plano de Testes Automatizados (Backend)

Conforme a regra obrigatória do projeto:
* O fixture `client: TestClient` será sempre injetado nas funções de teste.
* Nenhuma instância de `TestClient(app)` será criada em escopo global de módulo.

### Casos de Teste Essenciais (`tests/test_profile_clinical_enrichment.py`)
1. **`test_profile_empty_returns_clean_nulls()`**:
   - Garante que banco limpo retorne `medical_id` com valores `None`, sem campos sintéticos inventados.
2. **`test_profile_persists_medical_id_and_lifestyle()`**:
   - Faz `POST /api/profile` com `blood_type: "A+"`, `allergies: "Penicilina"`, `chronotype: "Noturno"`.
   - Verifica via `GET /api/profile` que todos os campos foram salvos e serializados corretamente.
3. **`test_profile_aggregates_biological_age_dynamically()`**:
   - Insere um registro em `phenoage_records` com idade cronológica 32.0 e fenotípica 29.5.
   - Faz `GET /api/profile` e valida que o bloco `biological_age` retorna `biological_age: 29.5` e `age_delta: -2.5`.
4. **`test_profile_calculates_whtr_correctly()`**:
   - Insere altura de 170 cm no perfil e medição de cintura de 85 cm em `daily_metrics`.
   - Valida que `whtr == 0.5`.

---

## 7. Critérios de Aceitação e Definição de Pronto (DoD)

- [ ] Migração 17 implementada e validada em SQLite com `PRAGMA user_version = 17`.
- [ ] Schema `longevidade/db/schema.py` sincronizado.
- [ ] Métodos auxiliares adicionados a `LongevityRepository` com tratamento para valores ausentes.
- [ ] Endpoint `GET /api/profile` e `POST /api/profile` funcionando com os novos campos.
- [ ] 100% de aprovação na suíte de testes de perfil (`pytest tests/test_profile*`).
