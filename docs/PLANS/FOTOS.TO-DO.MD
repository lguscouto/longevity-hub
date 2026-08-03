# Prompt para Codex — Módulo de Avaliações Físicas por Fotos

Você está trabalhando no projeto **Longevidade Hub**, localizado exclusivamente em:

```text
e:\hermes\longevidade
```

O projeto é uma plataforma local e privada para centralização e análise de dados de saúde, construída com:

* Frontend: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons e Recharts.
* Backend: FastAPI.
* Core de domínio: Python em `src/longevidade`.
* Banco de dados: SQLite em `data/longevity.sqlite3`.
* API local: `http://127.0.0.1:8011`.
* Testes backend: Pytest.
* Testes frontend: Vitest.

## Objetivo

Adicionar um novo módulo chamado **Avaliações Físicas**, destinado ao registro periódico de fotografias corporais.

O usuário deverá conseguir criar registros de avaliação física vinculados a uma data e adicionar fotos de diferentes ângulos, como:

* Frente;
* Costas;
* Lado esquerdo;
* Lado direito;
* Outras fotos opcionais.

As imagens deverão ser armazenadas localmente e organizadas de forma estruturada para permitir, futuramente, que o copiloto de IA compare avaliações de períodos diferentes e produza análises de evolução física.

Nesta primeira etapa, implemente apenas:

1. Cadastro das avaliações;
2. Importação e armazenamento das imagens;
3. Visualização do histórico;
4. Comparação visual manual entre dois períodos;
5. Estruturação dos dados para uma futura análise por IA.

Não implemente ainda análise corporal automatizada por IA.

---

# 1. Regras obrigatórias de arquitetura

## Isolamento de arquivos

Não leia, importe ou dependa permanentemente de arquivos fora de:

```text
e:\hermes\longevidade
```

As fotos deverão ser armazenadas em uma pasta interna administrada pela aplicação, por exemplo:

```text
data\physical_assessments\
```

Estrutura sugerida:

```text
data/
└── physical_assessments/
    └── <assessment_uuid>/
        ├── front.jpg
        ├── back.jpg
        ├── left_side.jpg
        ├── right_side.jpg
        └── additional_<uuid>.jpg
```

O nome físico do arquivo não deve depender do nome original enviado pelo usuário.

O nome original poderá ser preservado apenas como metadado no banco de dados.

## Importação pelo navegador

Permitir que o usuário:

1. Selecione arquivos individualmente;
2. Arraste e solte arquivos na interface;
3. Selecione múltiplas imagens;
4. Opcionalmente selecione uma pasta pelo navegador, quando o recurso for suportado.

Mesmo quando uma foto for selecionada em um diretório externo, o backend deverá copiar o conteúdo para a pasta interna do projeto.

Não salve apenas o caminho original do arquivo externo.

## Compatibilidade

Não alterar assinaturas existentes do `LongevityRepository` sem atualizar:

* todas as chamadas do backend;
* os testes;
* os módulos dependentes.

Prefira adicionar novos métodos específicos ao repositório.

---

# 2. Novo item de navegação

Adicionar ao menu principal do frontend um novo item:

```text
Avaliações Físicas
```

Ícone sugerido: câmera, imagens ou usuário.

A página deverá seguir o mesmo padrão visual dos demais módulos do Longevidade Hub.

A rota poderá ser semelhante a:

```text
/physical-assessments
```

ou seguir o padrão de navegação já existente no projeto.

Antes de implementar, examine como as páginas atuais, menus e rotas estão organizados e reutilize os componentes existentes.

---

# 3. Funcionalidades da página

A página deverá possuir três áreas principais.

## 3.1 Histórico de avaliações

Exibir os registros em formato de cartões ou linha do tempo.

Cada avaliação deverá mostrar:

* Data da avaliação;
* Título;
* Peso, quando informado;
* Percentual de gordura, quando informado;
* Quantidade de fotos;
* Miniatura da foto frontal ou primeira imagem disponível;
* Observações resumidas;
* Data de criação do registro.

A ordenação padrão deverá ser da avaliação mais recente para a mais antiga.

Incluir estados visuais para:

* carregamento;
* lista vazia;
* erro;
* registro sem foto;
* imagem indisponível.

## 3.2 Nova avaliação

Criar formulário ou modal para registrar uma avaliação física.

Campos:

```text
Data da avaliação — obrigatório
Título — opcional
Peso em kg — opcional
Percentual de gordura corporal — opcional
Circunferência da cintura em cm — opcional
Circunferência do abdômen em cm — opcional
Circunferência do quadril em cm — opcional
Observações — opcional
```

Permitir adicionar imagens utilizando:

* seletor de arquivos;
* seleção múltipla;
* arrastar e soltar;
* seleção de diretório, quando suportado pelo navegador.

Após selecionar as imagens, mostrar uma tela de revisão antes do envio.

Para cada imagem, permitir classificar o ângulo como:

```text
Frente
Costas
Lado esquerdo
Lado direito
Outro
```

Permitir também informar:

* Estado corporal: relaxado, contraído ou não informado;
* Descrição opcional;
* Ordem de exibição.

O usuário deverá poder:

* visualizar miniatura;
* alterar o ângulo;
* remover uma imagem antes de salvar;
* reorganizar as imagens;
* cancelar o cadastro;
* salvar a avaliação.

Não permitir o envio sem uma data de avaliação.

Uma avaliação poderá ser salva sem fotos, mas a interface deverá alertar que o registro não possui imagens.

## 3.3 Detalhes da avaliação

Ao abrir uma avaliação, mostrar:

* Dados do período;
* Galeria das fotos;
* Foto ampliada;
* Metadados;
* Observações;
* Opção de editar;
* Opção de excluir;
* Opção de adicionar novas fotos;
* Opção de remover uma foto individualmente.

A exclusão de uma avaliação deverá apagar:

1. O registro do banco;
2. Os registros das fotos;
3. Os arquivos físicos correspondentes.

Implementar confirmação antes da exclusão.

---

# 4. Comparação visual entre períodos

Adicionar um modo chamado:

```text
Comparar períodos
```

O usuário deverá selecionar duas avaliações:

```text
Avaliação anterior
Avaliação atual
```

A comparação deverá exibir lado a lado fotos do mesmo ângulo.

Exemplo:

```text
Frente anterior | Frente atual
Costas anterior | Costas atual
Lado esquerdo anterior | Lado esquerdo atual
Lado direito anterior | Lado direito atual
```

Requisitos:

* Utilizar o ângulo cadastrado em cada foto para realizar o pareamento;
* Informar quando uma avaliação não possuir foto equivalente;
* Mostrar as datas das duas avaliações;
* Mostrar a diferença de tempo entre os registros;
* Mostrar diferenças numéricas de peso, gordura corporal e circunferências quando esses valores existirem;
* Não produzir julgamentos estéticos;
* Não implementar análise automatizada nesta etapa.

Opcionalmente, implementar um controle visual de comparação por sobreposição ou divisor deslizante apenas se isso não aumentar excessivamente a complexidade.

Priorize primeiro uma comparação lado a lado funcional e responsiva.

---

# 5. Modelagem de dados

Analise o sistema atual de inicialização e migração do SQLite antes de criar as tabelas.

Criar uma entidade para avaliações físicas e outra para as imagens.

Estrutura conceitual sugerida:

## Tabela `physical_assessments`

```sql
id TEXT PRIMARY KEY
assessment_date TEXT NOT NULL
title TEXT
weight_kg REAL
body_fat_percentage REAL
waist_cm REAL
abdomen_cm REAL
hip_cm REAL
notes TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

## Tabela `physical_assessment_photos`

```sql
id TEXT PRIMARY KEY
assessment_id TEXT NOT NULL
angle TEXT NOT NULL
body_state TEXT
description TEXT
original_filename TEXT
stored_filename TEXT NOT NULL
relative_path TEXT NOT NULL
mime_type TEXT NOT NULL
file_size INTEGER NOT NULL
sha256 TEXT NOT NULL
width INTEGER
height INTEGER
display_order INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL
FOREIGN KEY (assessment_id)
    REFERENCES physical_assessments(id)
    ON DELETE CASCADE
```

Utilizar UUIDs ou o padrão de identificadores já adotado pelo projeto.

Valores permitidos para `angle`:

```text
front
back
left_side
right_side
other
```

Valores permitidos para `body_state`:

```text
relaxed
flexed
unspecified
```

Criar índices úteis, principalmente para:

* `assessment_date`;
* `assessment_id`;
* `angle`;
* `sha256`.

O banco deve armazenar apenas caminhos relativos internos.

Não armazenar caminhos absolutos como:

```text
E:\hermes\longevidade\data\...
```

Armazenar algo semelhante a:

```text
data/physical_assessments/<assessment_uuid>/front.jpg
```

---

# 6. Repositório e domínio

Adicionar métodos claros ao `LongevityRepository` ou à camada de repositório apropriada.

Sugestão de operações:

```python
create_physical_assessment(...)
update_physical_assessment(...)
get_physical_assessment(...)
list_physical_assessments(...)
delete_physical_assessment(...)

add_physical_assessment_photo(...)
get_physical_assessment_photo(...)
list_physical_assessment_photos(...)
update_physical_assessment_photo(...)
delete_physical_assessment_photo(...)
```

Separar corretamente:

* persistência no banco;
* validação dos dados;
* gravação de arquivos;
* remoção de arquivos;
* lógica de API.

Não colocar toda a lógica diretamente no router FastAPI.

Criar um serviço de domínio ou serviço de aplicação para controlar a importação das imagens.

Exemplo conceitual:

```text
PhysicalAssessmentService
```

Responsabilidades:

* validar arquivos;
* gerar UUIDs;
* gerar hash SHA-256;
* detectar duplicatas;
* criar diretórios internos;
* salvar imagens;
* coletar dimensões;
* persistir metadados;
* remover arquivos em caso de falha;
* manter consistência entre banco e sistema de arquivos.

---

# 7. API REST

Criar endpoints seguindo o padrão já utilizado em `backend/app/routers/`.

Sugestão:

```http
GET    /api/physical-assessments
POST   /api/physical-assessments
GET    /api/physical-assessments/{assessment_id}
PATCH  /api/physical-assessments/{assessment_id}
DELETE /api/physical-assessments/{assessment_id}
```

Para as fotos:

```http
POST   /api/physical-assessments/{assessment_id}/photos
PATCH  /api/physical-assessments/{assessment_id}/photos/{photo_id}
DELETE /api/physical-assessments/{assessment_id}/photos/{photo_id}
GET    /api/physical-assessments/{assessment_id}/photos/{photo_id}/content
```

O upload deverá utilizar:

```text
multipart/form-data
```

O endpoint de listagem deverá aceitar, quando fizer sentido:

```text
limit
offset
start_date
end_date
```

A API não deverá retornar caminhos físicos completos do sistema operacional.

Para exibir a imagem, retornar uma URL interna da API.

Exemplo:

```json
{
  "id": "photo-uuid",
  "angle": "front",
  "content_url": "/api/physical-assessments/assessment-uuid/photos/photo-uuid/content"
}
```

Proteger os endpoints contra:

* path traversal;
* nomes de arquivo maliciosos;
* MIME type falso;
* arquivos vazios;
* extensões não permitidas;
* payloads excessivamente grandes;
* tentativa de acessar arquivos fora da pasta interna.

---

# 8. Validação das imagens

Aceitar inicialmente:

```text
JPEG
PNG
WebP
```

Extensões permitidas:

```text
.jpg
.jpeg
.png
.webp
```

Não confiar apenas na extensão ou no `Content-Type` enviado pelo navegador.

Validar o conteúdo real do arquivo utilizando uma biblioteca adequada já disponível no projeto ou adicionar uma dependência mínima e justificada, como Pillow.

Definir limites configuráveis:

```text
Tamanho máximo por imagem: 15 MB
Quantidade máxima inicial por avaliação: 20 imagens
```

Caso seja necessário adicionar configurações, centralize-as em um módulo de configuração.

Extrair e armazenar:

* largura;
* altura;
* formato;
* tamanho;
* hash SHA-256.

Não guardar o arquivo original usando diretamente o nome enviado pelo usuário.

Gerar nomes seguros, por exemplo:

```text
<photo_uuid>.jpg
```

Quando adequado, corrigir a orientação da imagem utilizando os metadados EXIF.

Por privacidade, remova metadados EXIF desnecessários durante a cópia, especialmente:

* localização GPS;
* modelo do aparelho;
* data original;
* outros metadados não necessários.

Não altere significativamente a qualidade visual das imagens.

---

# 9. Consistência e transações

Evitar registros órfãos e arquivos abandonados.

Fluxo recomendado para upload:

1. Validar o arquivo;
2. Criar arquivo temporário interno;
3. Calcular hash e metadados;
4. Criar o registro no banco;
5. Mover o arquivo para o diretório definitivo;
6. Confirmar a operação.

Caso qualquer etapa falhe:

* remover arquivos temporários;
* desfazer registros incompletos;
* retornar mensagem de erro clara;
* registrar o erro no sistema de logs.

Na exclusão:

1. Confirmar que o arquivo pertence ao diretório interno permitido;
2. Remover o registro;
3. Remover o arquivo;
4. Remover o diretório da avaliação se estiver vazio.

Não usar:

```python
except:
    pass
```

Não ocultar falhas de sistema de arquivos.

---

# 10. Privacidade e segurança

As fotos são dados pessoais sensíveis.

Implementar as seguintes medidas:

* armazenamento exclusivamente local;
* nenhuma transmissão automática aos provedores de IA;
* nenhuma chamada para OpenAI, Anthropic ou OpenRouter nesta etapa;
* nenhum reconhecimento facial;
* nenhuma classificação automática do corpo;
* nenhum upload para serviços externos;
* endpoints limitados aos registros existentes no banco;
* validação rigorosa dos caminhos;
* logs sem conteúdo binário ou caminho externo original completo.

Adicionar uma mensagem na interface:

```text
As fotos são armazenadas localmente no Longevidade Hub e não são enviadas automaticamente a provedores de Inteligência Artificial.
```

---

# 11. Preparação para futura análise por IA

Embora a análise por IA não deva ser implementada agora, a estrutura precisa permitir essa evolução.

Cada avaliação deverá possuir dados suficientemente organizados para que, futuramente, um serviço possa comparar:

* avaliação anterior;
* avaliação atual;
* fotos com o mesmo ângulo;
* peso;
* percentual de gordura;
* circunferências;
* intervalo entre avaliações;
* observações do usuário.

Preparar uma função ou DTO que gere um manifesto estruturado da comparação, sem enviar nada para uma IA.

Exemplo conceitual:

```json
{
  "previous_assessment": {
    "id": "uuid",
    "date": "2026-06-01",
    "weight_kg": 92.0
  },
  "current_assessment": {
    "id": "uuid",
    "date": "2026-07-01",
    "weight_kg": 89.5
  },
  "days_between": 30,
  "matched_photos": [
    {
      "angle": "front",
      "previous_photo_id": "uuid",
      "current_photo_id": "uuid"
    }
  ]
}
```

Essa função deverá apenas estruturar os dados.

Não criar prompts clínicos nem enviar as imagens para provedores externos.

---

# 12. Experiência do usuário

A interface deve ser responsiva e funcionar em desktop e dispositivos móveis.

Implementar:

* miniaturas;
* indicador de progresso de upload;
* mensagens de sucesso e erro;
* confirmação de exclusão;
* identificação clara do ângulo;
* feedback para arquivos rejeitados;
* prevenção de envios duplicados;
* acessibilidade básica;
* navegação por teclado;
* textos alternativos nas imagens;
* botões com rótulos claros.

No celular, a seleção de arquivos deverá permitir usar a câmera quando o navegador oferecer essa opção.

Não force a abertura direta da câmera. Mantenha também a seleção da galeria.

---

# 13. Testes obrigatórios

## Backend

Criar testes Pytest para:

* criação de avaliação;
* edição;
* listagem;
* filtros por data;
* exclusão;
* upload JPEG válido;
* upload PNG válido;
* rejeição de arquivo inválido;
* rejeição de arquivo acima do limite;
* tentativa de path traversal;
* remoção física da imagem;
* exclusão em cascata;
* cálculo correto de SHA-256;
* armazenamento de caminho relativo;
* geração do manifesto de comparação;
* comparação sem foto equivalente;
* falha de gravação sem deixar registro órfão.

Usar diretórios temporários nos testes.

Os testes nunca deverão salvar fotos reais permanentemente em `data/`.

## Frontend

Criar testes Vitest para:

* exibição do menu;
* estado vazio;
* carregamento do histórico;
* abertura do formulário;
* validação da data obrigatória;
* seleção de imagens;
* classificação de ângulo;
* remoção de imagem antes do envio;
* exibição dos detalhes;
* confirmação de exclusão;
* seleção das duas avaliações;
* comparação lado a lado;
* tratamento de erros da API.

---

# 14. Documentação

Atualizar:

```text
docs/architecture.md
docs/api-reference.md
docs/data-model-and-security.md
docs/development-and-validation.md
```

Documentar:

* finalidade do módulo;
* estrutura das tabelas;
* pasta de armazenamento;
* endpoints;
* limites de upload;
* formatos aceitos;
* regras de privacidade;
* comportamento da exclusão;
* preparação para futura integração com IA.

Também atualizar o documento de visão geral, caso ele exista dentro do repositório.

---

# 15. Critérios de aceitação

A tarefa somente será considerada concluída quando:

1. O menu **Avaliações Físicas** estiver disponível;
2. For possível criar uma avaliação com data e informações opcionais;
3. For possível importar várias fotos pelo navegador;
4. As fotos forem copiadas para uma pasta interna;
5. Nenhum caminho externo for armazenado como dependência;
6. For possível classificar cada foto por ângulo;
7. O histórico mostrar avaliações anteriores;
8. For possível abrir, editar e excluir uma avaliação;
9. A exclusão remover banco e arquivos;
10. For possível comparar visualmente duas avaliações;
11. As fotos forem pareadas pelo ângulo;
12. O sistema estiver preparado para uma futura comparação por IA;
13. Todos os testes backend passarem;
14. Todos os testes frontend passarem;
15. O build do frontend for concluído sem erros;
16. A documentação estiver atualizada.

---

# 16. Processo de execução

Antes de modificar o código:

1. Analise a arquitetura atual;
2. Localize os componentes de navegação;
3. Localize os routers FastAPI;
4. Localize a inicialização e migração do SQLite;
5. Localize o `LongevityRepository`;
6. Identifique os padrões existentes de formulários, modais, tabelas e tratamento de erros;
7. Apresente um plano sucinto dos arquivos que serão alterados.

Durante a implementação:

* reutilize os padrões existentes;
* evite criar abstrações desnecessárias;
* mantenha tipagem forte no TypeScript;
* use modelos Pydantic explícitos;
* preserve compatibilidade com funcionalidades existentes;
* investigue a causa raiz de qualquer falha;
* não comente ou desative testes.

Ao final, execute obrigatoriamente:

```bash
python -m pytest
```

Depois:

```bash
cd frontend
npm run test -- --run
```

Depois:

```bash
npm run build
```

Apresente no relatório final:

1. Resumo da implementação;
2. Arquivos criados;
3. Arquivos alterados;
4. Estrutura final das tabelas;
5. Endpoints adicionados;
6. Decisões de segurança;
7. Testes executados;
8. Resultado exato de cada comando;
9. Limitações conhecidas;
10. Próximos passos recomendados.

Não declare a tarefa concluída se algum teste ou build falhar.
