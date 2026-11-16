/**
 * Trechos reais do corpus do rag-eval-harness (data/corpus/*.md), exportados do
 * banco com os mesmos ids de chunk. Cada conteúdo foi cortado em ~900 caracteres.
 * Gerado a partir do Postgres local em 2026-11-16; não editar à mão.
 */
import type { SearchHit } from './schemas';

export type FixtureChunk = Omit<SearchHit, 'score'>;

export const FIXTURE_CHUNKS: FixtureChunk[] = [
  {
    "chunkId": 2028611514,
    "documentSlug": "arranjos-pagamento",
    "documentTitle": "Resolução BCB N° 150",
    "sectionPath": "CAPÍTULO IV — DOS ARRANJOS DE PAGAMENTO > Seção I — Das Modalidades",
    "isTable": false,
    "content": "CAPÍTULO IV — DOS ARRANJOS DE PAGAMENTO > Seção I — Das Modalidades\n\nArt. 8º\nQuanto ao seu propósito, um arranjo pode ser classificado como de:\n\nI - compra, quando o serviço de pagamento\ndisciplinado pelo arranjo sempre estiver vinculado à liquidação de determinada\nobrigação pelo usuário pagador perante o usuário recebedor; ou\n\nII - transferência, quando o serviço de\npagamento disciplinado pelo arranjo não necessariamente estiver vinculado à\nliquidação de determinada obrigação.\n\nArt. 9º\nQuanto ao relacionamento dos usuários finais com a instituição\nparticipante, um arranjo pode ser classificado como de:\n\nI - conta de pagamento pré-paga;\n\nII - conta de pagamento pós-paga;\n\nIII - conta de depósito; ou\n\nIV - relacionamento eventual, quando o serviço\nde pagamento puder ser realizado a partir de ou para cliente que não possua, na\ninstituição que lhe presta o serviço de pagamento, conta que se"
  },
  {
    "chunkId": 1793491141,
    "documentSlug": "boleto",
    "documentTitle": "Resolução BCB N° 443",
    "sectionPath": "Preâmbulo",
    "isTable": false,
    "content": "Preâmbulo\n\n# Resolução BCB N° 443\n\nRESOLUÇÃO BCB Nº 443,\nDE 12 DE DEZEMBRO DE 2024\n\nDisciplina o arranjo\nde pagamento do boleto, as espécies do instrumento boleto, sua emissão e formas\nde apresentação, bem como a forma de liquidação das transferências de fundos a\nele associadas.\n\nA Diretoria Colegiada do Banco Central\ndo Brasil, em sessão realizada em 12 de dezembro de 2024, com base nos arts. 9º\ne 11, caput, inciso VI, da Lei nº 4.595, de 31 de dezembro de 1964, no\nart. 10 da Lei nº 10.214, de 27 de março de 2001, e no art. 9º da Lei nº\n12.865, de 9 de outubro de 2013, e tendo em vista o disposto nos arts. 4º e 12 da\nResolução CMN nº 4.952, de 30 de setembro de 2021, na Resolução nº 4.557, de 23\nde fevereiro de 2017, e na Resolução BCB nº 150, de 6 de outubro de 2021,\n\nR E S O L V E :"
  },
  {
    "chunkId": 1389147384,
    "documentSlug": "boleto",
    "documentTitle": "Resolução BCB N° 443",
    "sectionPath": "CAPÍTULO — I — DO — OBJETO E DO ÂMBITO DE APLICAÇÃO",
    "isTable": false,
    "content": "CAPÍTULO — I — DO — OBJETO E DO ÂMBITO DE APLICAÇÃO\n\nArt. 1º Esta Resolução disciplina o arranjo\nde pagamento do boleto, as espécies do instrumento boleto, sua emissão e formas\nde apresentação, bem como a forma de liquidação das transferências de fundos a\nele associadas."
  },
  {
    "chunkId": 340496277,
    "documentSlug": "instituicoes-pagamento",
    "documentTitle": "Resolução BCB N° 80",
    "sectionPath": "CAPÍTULO — III — DA CONSTITUIÇÃO DE INSTITUIÇÃO DE PAGAMENTO",
    "isTable": false,
    "content": "CAPÍTULO — III — DA CONSTITUIÇÃO DE INSTITUIÇÃO DE PAGAMENTO\n\nI - definir atribuições e responsabilidades; e\n\nII - ser adequadamente documentada e submetida a\nrevisões a cada dois anos, com a documentação mantida à disposição do Banco\nCentral do Brasil. Art. 7º Os\ncontratos sociais das instituições de pagamento constituídas sob a forma de\nsociedades limitadas deverão conter cláusulas explicitando que: I - o mandato do administrador terá prazo\ndeterminado, não superior a quatro anos, admitida a recondução; II - o mandato dos administradores estender-se-á\naté a posse dos seus substitutos; e\n\nIII - a administração da instituição de pagamento\ndeve ser exercida por, no mínimo, três administradores.\n\nArt. 8º A\nutilização do termo \"diretor\" é exclusiva das pessoas eleitas ou\nnomeadas na forma do estatuto ou do contrato social da instituição de\npagamento."
  },
  {
    "chunkId": 816031755,
    "documentSlug": "instituicoes-pagamento",
    "documentTitle": "Resolução BCB N° 80",
    "sectionPath": "CAPÍTULO — V — DA ATUAÇÃO DA INSTITUIÇÃO DE PAGAMENTO EM NOVA — MODALIDADE",
    "isTable": false,
    "content": "CAPÍTULO — V — DA ATUAÇÃO DA INSTITUIÇÃO DE PAGAMENTO EM NOVA — MODALIDADE\n\nArt. 14. A\ninstituição de pagamento autorizada a prestar serviço em pelo menos uma das\nmodalidades previstas nos incisos I a III do art. 3º fica dispensada de\nsolicitar autorização para prestar serviço de pagamento em quaisquer outras\nmodalidades previstas nos incisos I a IV do referido artigo, se houver previsão\nestatutária ou contratual de que a atividade faz parte do objeto social da instituição.\n\nParágrafo único. A instituição de pagamento deve comunicar ao\nBanco Central do Brasil com noventa dias de antecedência sua intenção de\niniciar a prestação de serviço em nova modalidade.\n\nArt. 15. A\ninstituição de pagamento deve comunicar ao Banco Central do Brasil com noventa\ndias de antecedência sua intenção de encerrar a prestação de serviço em\nquaisquer das modalidades previstas nos incisos I a IV do art. 3º.\n\nPar"
  },
  {
    "chunkId": 1180158685,
    "documentSlug": "open-finance",
    "documentTitle": "Resolução Conjunta Nº 1",
    "sectionPath": "CAPÍTULO II",
    "isTable": false,
    "content": "CAPÍTULO II\n\nDISPOSIÇÕES PRELIMINARES\n\nDas Definições\n\nArt. 2º Para os fins do disposto nesta Resolução Conjunta, considera-se:\n\nI - Open Banking: compartilhamento padronizado de dados e serviços por meio de abertura e integração de sistemas;\n\nII - cliente: qualquer pessoa natural ou jurídica, exceto as instituições de que trata o art. 1º, que mantém relacionamento destinado à prestação de serviço financeiro ou à realização de operação financeira com as instituições de que trata esta Resolução Conjunta, inclusive para a realização de transação de pagamento;\n\nIII - instituição transmissora de dados: instituição participante que compartilha com a instituição receptora os dados do escopo desta Resolução Conjunta;\n\nIV - instituição receptora de dados: instituição participante que apresenta solicitação de compartilhamento à instituição transmissora de dados para recepção dos dados do escopo d"
  },
  {
    "chunkId": 724088953,
    "documentSlug": "open-finance-escopo",
    "documentTitle": "Resolução BCB N° 32",
    "sectionPath": "CAPÍTULO VIII-A — DA EXPERIÊNCIA DO CLIENTE",
    "isTable": false,
    "content": "CAPÍTULO VIII-A — DA EXPERIÊNCIA DO CLIENTE\n\nArt. 16-A. O Manual\nde Experiência do Cliente no Open Finance deve conter: (Redação dada, a\npartir de 1º/4/2023, pela Resolução BCB nº 294, de 23/2/2023.)\n\nI - os princípios que devem nortear a\nexperiência do cliente no processo de solicitação de compartilhamento de dados\ne serviços no Open Finance; e (Redação dada, a\npartir de 1º/4/2023, pela Resolução BCB nº 294, de 23/2/2023.)\n\nII - os requisitos do guia de experiência do\ncliente, inclusive o seu conteúdo e estrutura de tópicos, com vistas a\nharmonizar as etapas de consentimento, autenticação e confirmação entre as\ninstituições participantes do Open Finance. (Redação dada, a\npartir de 1º/4/2023, pela Resolução BCB nº 294, de 23/2/2023.)\n\nParágrafo único. O guia de que trata o\ninciso II do caput deve:\n\nI - abranger os diferentes casos de uso possíveis; (Redação dada pela\nResolução BCB nº 398"
  },
  {
    "chunkId": 126412780,
    "documentSlug": "pix-manual",
    "documentTitle": "Manual de Padrões para Iniciação do Pix (v2.10.0)",
    "sectionPath": "00. GUI 14 M br.gov.bcb.pix",
    "isTable": false,
    "content": "Tipo de Chave Exemplo E-mail codificado no seguinte formato: fulano_da_silva.recebedor@example.com CPF ou CNPJ codificados nos seguintes formatos: CPF: 12345678900 CNPJ: 00038166000105 CNPJ: 12ABC34501DE35 Número de telefone celular codificado seguindo o formato internacional: +5561912345678 em que: +55: código do país, 61: código do território ou estado, 912345678: número do telefone celular. Chave aleatória codificada juntamente com a pontuação, como segue: 123e4567-e12b-12d1-a456-426655440000\n\n11 M – Mandatório; O – opcional. 12 O ID pode ser qualquer um dos identificadores dentro da faixa 26-51. 13 O ID pode ser qualquer um dos identificadores dentro da faixa 80-99.\n\nAs URLs presentes nos QR Codes, também chamadas de “ locations”, não devem incluir prefixo de protocolo. O acesso deverá ser realizado após 14 validações15, incluindo o domínio válido autorizado pelo PSP do recebedor par"
  },
  {
    "chunkId": 1618569347,
    "documentSlug": "pix-manual",
    "documentTitle": "Manual de Padrões para Iniciação do Pix (v2.10.0)",
    "sectionPath": "4. Identificador da transação “TransactionIdentification <TxId>” BR Code ID62-0521",
    "isTable": false,
    "content": "4. Identificador da transação “TransactionIdentification <TxId>” BR Code ID62-0521\n\n5 Facilitador de serviço de saque Opcional\n\nO mapeamento para o QR Code gerado pelo recebedor, segundo o manual do BR Code, utiliza os campos a seguir:\n\nID Merchant Account Information 26..51 ID Nome Tamanho Uso Descrição"
  },
  {
    "chunkId": 717093171,
    "documentSlug": "pix-manual",
    "documentTitle": "Manual de Padrões para Iniciação do Pix (v2.10.0)",
    "sectionPath": "5. Tags específicas para o Pix Automático",
    "isTable": false,
    "content": "5. Tags específicas para o Pix Automático\n\nTags criadas para a implementação do Pix Automático na API Pix:\n\nTag Função Rec Criação do payload da recorrência e gestão de recorrências. RecPayload Utilizados pelo PSP pagador para recuperar o payload JSON que representa uma recorrência. PayloadLocationRec Gestão de locations relacionadas aos payloads de recorrência. SolicRec Gestão de solicitações de recorrências. CobR Gestão de cobranças recorrentes. WebhookRec Notificações das ações relacionadas às recorrências. WebhookCobR Notificações das ações relacionadas às cobranças recorrentes."
  },
  {
    "chunkId": 1954641337,
    "documentSlug": "pix-regulamento",
    "documentTitle": "Resolução BCB N° 1",
    "sectionPath": "CAPÍTULO X — DA AUTORIZAÇÃO PARA INICIAÇÃO E DA REJEIÇÃO DE TRANSAÇÕES",
    "isTable": false,
    "content": "CAPÍTULO X — DA AUTORIZAÇÃO PARA INICIAÇÃO E DA REJEIÇÃO DE TRANSAÇÕES\n\ne (Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\nV\n- outros fatores, a critério de cada participante. (Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\n§\n2º O bloqueio cautelar deve ser efetivado simultaneamente ao crédito na conta\ntransacional do usuário recebedor. (Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\n§\n3º O participante prestador de serviço de pagamento deverá comunicar\nimediatamente ao usuário recebedor a efetivação do bloqueio cautelar. (Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\n§\n4º O bloqueio cautelar durará no má"
  },
  {
    "chunkId": 456840834,
    "documentSlug": "pix-regulamento",
    "documentTitle": "Resolução BCB N° 1",
    "sectionPath": "CAPÍTULO X — DA AUTORIZAÇÃO PARA INICIAÇÃO E DA REJEIÇÃO DE TRANSAÇÕES",
    "isTable": false,
    "content": "CAPÍTULO X — DA AUTORIZAÇÃO PARA INICIAÇÃO E DA REJEIÇÃO DE TRANSAÇÕES\n\n(Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\n§\n9º O usuário recebedor poderá solicitar a devolução do Pix em montante\ncorrespondente ao valor da transação original enquanto os recursos estiverem\ncautelarmente bloqueados. (Incluído, a partir\nde 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021, produzindo efeitos a\npartir de 16/11/2021.)\n\nArt. 39-C. Para fins de avaliação de\nsuspeita de fraude ou de fundada suspeita de fraude em transações Pix, os\nparticipantes deverão adotar, no mínimo, os critérios indicados pelo Banco\nCentral do Brasil, a ser divulgado em documento específico. (Incluído\npela Resolução BCB nº 506, de 26/9/2025.)"
  },
  {
    "chunkId": 978907362,
    "documentSlug": "pix-regulamento",
    "documentTitle": "Resolução BCB N° 1",
    "sectionPath": "CAPÍTULO XI — DA DEVOLUÇÃO DE TRANSAÇÕES > Seção II — Do Mecanismo Especial de Devolução",
    "isTable": false,
    "content": "CAPÍTULO XI — DA DEVOLUÇÃO DE TRANSAÇÕES > Seção II — Do Mecanismo Especial de Devolução\n\n41-I. Observado o disposto no inciso I do art. 41-A, o participante prestador\nde serviço de pagamento do usuário recebedor responderá pelos eventuais\nprejuízos causados pela não devolução dos recursos quando: (Incluído,\na partir de 1º/11/2021, pela Resolução BCB nº 103, de 8/6/2021, produzindo\nefeitos a partir de 16/11/2021.)\n\nI\n- rejeitar, sem justo motivo, a notificação de infração de que trata o art.\n78-F, quando vinculada a uma solicitação de devolução; (Redação\ndada, a partir de 1º/1/2023, pela Resolução BCB nº 269, de 1º/12/2022.)\n\nII\n- (Revogado\npela Resolução BCB nº 403, de 22/7/2024.)\n\nArt.\n42. (Revogado,\na partir de 1º/11/2021, pela Resolução BCB nº 103, de 8/6/2021, produzindo\nefeitos a partir de 16/11/2021.)"
  },
  {
    "chunkId": 598708002,
    "documentSlug": "pix-regulamento",
    "documentTitle": "Resolução BCB N° 1",
    "sectionPath": "CAPÍTULO XIII — DO DICT > Seção III — Das funcionalidades",
    "isTable": false,
    "content": "CAPÍTULO XIII — DO DICT > Seção III — Das funcionalidades\n\n(Redação\ndada, a partir de 1º/4/2021, pela Resolução BCB nº 79, de 18/3/2021.)\n\nVIII - notificação de\ninfração: permite a notificação de infração, por suspeita de fraude na\ntransação; (Redação\ndada, a partir de 1º/11/2021, pela Resolução BCB nº 103, de 8/6/2021,\nproduzindo efeitos a partir de 16/11/2021.)\n\nIX -\nverificação de chaves Pix registradas: permite verificar se uma determinada\nchave Pix está registrada no DICT; (Redação\ndada, a partir de 28/9/2021, pela Resolução BCB nº 147, de 28/9/2021,\nproduzindo efeitos a partir de 16/11/2021.)\n\nX -\nsolicitação de devolução: permite a solicitação de devolução de uma transação\nPix; (Redação\ndada pela Resolução BCB nº 493, de 28/8/2025.)\n\nXI -\nconsulta a informações vinculadas às chaves Pix para fins de segurança do Pix;\ne (Redação\ndada pela Resolução BCB nº 493, de 28/8/2025.)\n\nXII -"
  },
  {
    "chunkId": 1436200835,
    "documentSlug": "pld-ft",
    "documentTitle": "Circular N° 3.978",
    "sectionPath": "CAPÍTULO I",
    "isTable": false,
    "content": "CAPÍTULO I\n\nDO OBJETO E DO ÂMBITO DE APLICAÇÃO\n\nArt. 1º Esta Circular dispõe sobre a política, os procedimentos e os controles internos a serem adotados pelas instituições autorizadas a funcionar pelo Banco Central do Brasil visando à prevenção da utilização do sistema financeiro para a prática dos crimes de “lavagem” ou ocultação de bens, direitos e valores, de que trata a Lei nº 9.613, de 3 de março de 1998, e de financiamento do terrorismo, previsto na Lei nº 13.260, de 16 de março de 2016.\n\nParágrafo único. Para os fins desta Circular, os crimes referidos no caput serão denominados genericamente “lavagem de dinheiro” e “financiamento do terrorismo”."
  }
];
