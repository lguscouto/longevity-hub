# Laudos, histórico e portabilidade

## Dependências locais para leitura de laudos

Instale as dependências Python do projeto a partir do lock existente: `pip install -r backend/requirements-lock.txt`. O pacote `pypdfium2` fornece o PDFium para extração e renderização local. Para OCR, instale o Tesseract no computador servidor, incluindo os dados do idioma português (`por`), e coloque o executável `tesseract` no `PATH` do processo do servidor. No Windows, uma instalação típica fica em `C:\Program Files\Tesseract-OCR`; inclua essa pasta no PATH se necessário e reinicie o servidor. Confira com `tesseract --version` e `tesseract --list-langs`; a lista precisa conter `por`. Use o instalador e os dados de idioma disponibilizados pela distribuição escolhida e verifique sua procedência.

Em Exames, escolha **Importar laudo** e informe PDF, PNG ou JPEG, ou preencha manualmente. O arquivo é lido localmente; não é enviado a provedor externo. A extração limita o arquivo a 16 MB, o PDF a 20 páginas, a imagem renderizada a 20 megapixels e o processamento a 60 segundos. Páginas sem texto suficiente passam por OCR; se o OCR falhar, a prévia informa o problema e continua permitindo preenchimento manual. A identificação automática é conservadora e não reconhece todos os formatos. Compare os campos com o original: nome, página, data, valor e unidade originais, referências e método. A unidade normalizada aparece após validação. Página e método informados são preservados nas observações do registro.

Validar a prévia não grava resultados. A confirmação exige revisão explícita; possíveis duplicatas exigem decisão adicional. Valores expressos com desigualdade não são aceitos como valores exatos. Unidades clínicas desconhecidas ou incompatíveis são recusadas. Antes da confirmação, o servidor cria e verifica um backup de banco e fotos; o lote é gravado em uma transação e falhas revertem o lote. A comparação de coletas mantém a unidade e a referência associadas a cada registro, sem supor que resultados duplicados são idênticos.

## Histórico e experimentos

Na linha do tempo, selecione marcador e período para comparar exames, intervenções, mudanças registradas e sintomas. O check-in aceita eventos manuais com observação, intensidade e associação opcional a uma intervenção; eventos importados não podem ser alterados por esse fluxo. As datas e origens dependem dos registros existentes. Ausência de evento não comprova ausência de sintoma ou mudança, e coincidência temporal não demonstra causa.

Experimentos podem ser registrados com hipótese, métrica, períodos, aderência e outras mudanças informadas. Dados ausentes e número de observações são recalculados na consulta; estatísticas só aparecem com pelo menos três observações em cada período. Resultados são exploratórios e não constituem validação clínica. Campos adicionais são armazenados nas observações estruturadas do experimento sem migração de banco; observações legadas continuam legíveis. Registros anteriores podem não conter aderência ou mudanças simultâneas.

## Resumo e pacote de medições

No resumo para consulta, selecione exames, eventos e perguntas antes de copiar o Markdown ou gerar o PDF local. A seleção não altera os dados originais. Antes de enviar uma solicitação ao copiloto, revise o provedor, instruções e contexto exibidos; se o contexto mudar, será necessária nova revisão. O provedor recebe o contexto confirmado para processar a solicitação. Essas informações são sensíveis.

Em Exames, **Exportar medições (ZIP)** gera `manifest.json`, `LEIA-ME.txt` e arquivos JSON UTF-8 com exames, medições e qualidade, check-ins, eventos, intervenções, experimentos, suplementos, CGM, treinos, avaliações físicas e registros de origem disponíveis. O manifesto lista todas as tabelas incluídas e suas quantidades. Os exames incluem valor e unidade normalizados e brutos, data, referências e origem disponível; a qualidade diária contém a origem por métrica quando registrada. A proveniência antiga pode estar incompleta. O pacote **não é criptografado** e não inclui fotos, credenciais, configurações ou todas as tabelas: não substitui o backup. Guarde-o e compartilhe-o apenas em locais adequados a dados de saúde. Consulte [operação e backup](operacao-backup-e-fontes.md) para backup, verificação e restauração isolada.

Energy Bank, PhenoAge, KDM e as respostas do copiloto são informativos. A implementação e seus avisos não constituem revisão clínica independente.
