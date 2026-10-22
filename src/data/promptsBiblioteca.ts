export interface PromptItem {
  id: number
  numero: number
  titulo: string
  finalidade: string
  tema: string
  texto: string
}

export interface PromptTemaGroup {
  id: string
  nome: string
  ordem: number
  descricao?: string
  prompts: PromptItem[]
}

export const CONTEXTO_COMUM = `Operação de referência: fazenda de ciclo completo com cria, recria e engorda. Frente 1, fazenda própria com 2.420 ha totais, 1.452 ha de pasto consolidado e 4.000 cabeças de média, com IATF, RIP, TIP, terminação em confinamento e fábrica de suplemento própria. Frente 2, arrendamento de recria e engorda de fêmeas, com lotes entrando ao longo do ano e permanência média de 6 meses. Calendário: águas de outubro a março, seca de abril a setembro, estação de monta de setembro a março com 90 dias. As duas frentes nunca devem ser somadas por padrão. Estética editorial rural contemporânea: fundo areia com textura sutil, tipografia serifada nos títulos e sans humanista nos dados, paleta em verde-mata, terracota e areia, números em formato tabular. Dados sempre rotulados como ilustrativos.`

export const PROMPTS_DATA: PromptItem[] = [
  // TEMA 1 — PAINÉIS DE DECISÃO
  {
    id: 1,
    numero: 1,
    titulo: 'Plataforma completa em página única',
    finalidade: 'visão geral da plataforma em abas.',
    tema: 'Painéis de decisão',
    texto: `Crie uma página web interativa em português do Brasil: um dashboard de gestão de pecuária de corte com navegação por abas no topo, como demonstração funcional da plataforma. Aplique o contexto comum. Abas obrigatórias: Visão Geral com cartões de KPI (lotação UA/ha, GMD kg/dia, taxa de desmame %, mortalidade %, arrobas produzidas, custo por arroba R$) com semáforo contra meta; Reprodução com taxa de prenhez e parição por estação, distribuição de intervalo entre partos, perda embrionária/fetal e histórico entre safras; Desempenho com GMD por lote, peso à desmama ajustado aos 205 dias e quilos de bezerro desmamados por vaca exposta; Financeiro com custo por cabeça/mês por centro de custo, composição do custo da arroba, margem bruta por hectare e fluxo de caixa projetado; Metas com real versus meta por indicador, desvio em % e ação corretiva sugerida. Inclua seletor global de frente (Fazenda própria, Arrendamento, Consolidado) que filtra todos os gráficos, filtros de safra e período, gráficos e tabelas ordenáveis, responsivo e sem dependências externas. Rodapé informando que os dados são ilustrativos.`,
  },
  {
    id: 2,
    numero: 2,
    titulo: 'Painel Executivo de Safra',
    finalidade: 'leitura rápida diária do gestor.',
    tema: 'Painéis de decisão',
    texto: `Crie uma página web em português do Brasil: um painel executivo de safra para pecuária de corte, de leitura rápida, pensado para o gestor abrir todas as manhãs. Aplique o contexto comum. Mostre em uma única tela seis indicadores: lotação (UA/ha), GMD (kg/dia), taxa de desmame (%), mortalidade (%), arrobas produzidas (@) e custo por arroba produzida (R$/@). Estrutura: faixa superior com os seis KPIs em cartões grandes, cada um com valor atual, meta, desvio em % e semáforo (verde dentro da meta, amarelo até 10% de desvio, vermelho acima); gráfico de evolução mensal das arrobas produzidas e do custo por arroba com linha de meta sobreposta; bloco de alertas com os indicadores fora da tolerância, causa provável e ação corretiva sugerida; bloco de composição do rebanho por categoria em gráfico de barras; rodapé com data de atualização e nota de dados ilustrativos. Use valores plausíveis e coerentes entre si.`,
  },
  {
    id: 3,
    numero: 3,
    titulo: 'Painel Reprodutivo Avançado',
    finalidade: 'eficiência reprodutiva por estação de monta.',
    tema: 'Painéis de decisão',
    texto: `Crie uma página web em português do Brasil: um painel reprodutivo avançado para um rebanho de cria com IATF. Aplique o contexto comum. Objetivo: acompanhar a eficiência reprodutiva por estação de monta e identificar gargalos entre o diagnóstico de gestação e o nascimento. Estrutura: cartões de topo com taxa de prenhez, taxa de parição, taxa de desmame, perda embrionária/fetal e intervalo entre partos médio; gráfico de barras comparando taxa de prenhez e taxa de parição por estação nas últimas cinco safras; gráfico de distribuição das matrizes por faixa de intervalo entre partos (abaixo de 12 meses, de 12 a 14, acima de 14); bloco de perda embrionária/fetal indicando em qual terço da gestação a perda se concentrou; tabela de matrizes com brinco, número de partos, idade ao primeiro parto, IEP do último ciclo, peso do último bezerro desmamado e eficiência acumulada em partos por ano de vida; filtros por estação de monta, lote, touro e lote de IATF. Dados de demonstração: cerca de 1.200 matrizes expostas por estação, taxa de prenhez entre 80% e 88%, taxa de parição entre 76% e 84%, IEP médio entre 13 e 15 meses.`,
  },
  {
    id: 4,
    numero: 4,
    titulo: 'Painel de Desempenho e Produção',
    finalidade: 'potencial materno e ganho de peso por fase.',
    tema: 'Painéis de decisão',
    texto: `Crie uma página web em português do Brasil: um painel de desempenho e produção para pecuária de corte de ciclo completo. Aplique o contexto comum. Objetivo: medir o potencial materno do rebanho e o ganho de peso por fase, ligando desempenho animal a produtividade por hectare. Estrutura: cartões de topo com GMD médio, peso à desmama ajustado aos 205 dias, quilos de bezerro desmamados por vaca exposta, taxa de mortalidade geral e mortalidade de bezerros até a desmama; gráfico de GMD por lote e por fase (cria, recria, terminação) com linha de meta; gráfico de evolução do peso médio do lote ao longo do tempo com os pontos de pesagem marcados; gráfico de dispersão relacionando peso à desmama ajustado e idade da mãe; tabela de lotes com identificação, categoria, número de cabeças, peso de entrada, peso atual, GMD, dias de permanência e arrobas produzidas; bloco de mortalidade com quebra por categoria e por causa registrada. Dados de demonstração: GMD entre 0,45 e 0,85 kg/dia conforme a fase, peso à desmama ajustado entre 190 e 230 kg, mortalidade geral entre 1,5% e 3%.`,
  },
  {
    id: 5,
    numero: 5,
    titulo: 'Painel Financeiro e Custo por Arroba',
    finalidade: 'custo e receita por trás de cada decisão de manejo.',
    tema: 'Painéis de decisão',
    texto: `Crie uma página web em português do Brasil: um painel financeiro de pecuária de corte com foco em custo por arroba e margem por hectare. Aplique o contexto comum. Objetivo: mostrar o custo e a receita por trás de cada decisão de manejo, com rateio claro por centro de custo. Estrutura: cartões de topo com custo por cabeça/mês, custo do bezerro desmamado, custo por arroba produzida, margem bruta por hectare e ponto de equilíbrio em arrobas; gráfico de composição do custo da arroba em barras empilhadas (pastagem, suplementação, sanidade, mão de obra, combustível, manutenção, arrendamento e outros); gráfico de evolução do custo por arroba nos últimos doze meses com linha de preço de venda e linha de meta; gráfico de fluxo de caixa projetado por mês com destaque para os meses de maior desembolso, como compra de insumos para a seca e aquisição de bezerros para reposição; tabela de rateio por centro de custo com centro, valor total, critério de rateio (cabeça, UA, hectare ou consumo) e custo por cabeça resultante; seletor de frente com Fazenda própria e Arrendamento sempre separados e Consolidado apenas como leitura secundária. Dados de demonstração: custo por arroba entre R$ 180 e R$ 240, custo por cabeça/mês entre R$ 60 e R$ 110, margem bruta por hectare entre R$ 400 e R$ 900.`,
  },

  // TEMA 2 — SIMULADORES E CALCULADORAS
  {
    id: 6,
    numero: 6,
    titulo: 'Simulador de Ponto de Equilíbrio e Lucro Máximo por Lote',
    finalidade: 'descobrir o volume necessário para cobrir custo e onde está o lucro máximo.',
    tema: 'Simuladores e calculadoras',
    texto: `Crie uma página web em português do Brasil: um simulador interativo de ponto de equilíbrio e lucro máximo para um lote de gado de corte. Aplique o contexto comum. Controles deslizantes e campos numéricos: número de cabeças do lote, peso de entrada, peso de saída desejado, custo fixo total do período, custo variável por arroba produzida, preço de venda da arroba e taxa de mortalidade do lote. Saídas calculadas em tempo real: arrobas produzidas, custo total, receita total, lucro ou prejuízo do lote, ponto de equilíbrio em arrobas e em cabeças, margem de contribuição por arroba, lucro por cabeça e lucro por hectare. Visualizações: gráfico de linhas cruzando receita total e custo total com o ponto de equilíbrio destacado no cruzamento; gráfico de barras do lucro por cabeça em diferentes pesos de saída mostrando o ponto de lucro máximo; painel de semáforo indicando se o cenário é lucrativo, neutro ou deficitário. Inclua botões de cenário pré-definido (conservador, realista, otimista) e atualização instantânea ao mover os controles. Rodapé com nota de que os valores são simulação.`,
  },
  {
    id: 7,
    numero: 7,
    titulo: 'Simulador de Estação de Monta',
    finalidade: 'comparar IATF, monta natural e a combinação das duas.',
    tema: 'Simuladores e calculadoras',
    texto: `Crie uma página web em português do Brasil: um simulador comparativo de estratégias de estação de monta para um rebanho de cria. Aplique o contexto comum. Objetivo: comparar IATF, monta natural e a combinação das duas, mostrando o impacto no número de bezerros desmamados e no custo por bezerro produzido. Controles: número de matrizes expostas, duração da estação de monta em dias com padrão 90, taxa de prenhez esperada por estratégia, taxa de perda até a desmama, custo por matriz de cada estratégia, peso médio do bezerro à desmama e preço de venda do bezerro por quilo. Saídas comparadas lado a lado para cada estratégia: bezerros desmamados, taxa de desmame sobre vacas expostas, custo total, custo por bezerro desmamado, receita estimada e margem da estação. Visualizações: gráfico de barras comparando as três estratégias em bezerros desmamados e em custo por bezerro; gráfico de sensibilidade mostrando como a taxa de desmame varia com a duração da estação de monta; bloco de leitura técnica explicando o efeito do encurtamento da estação sobre a concentração de partos e o manejo. Rodapé com nota de que os valores são simulação e não substituem análise técnica individualizada.`,
  },
  {
    id: 8,
    numero: 8,
    titulo: 'Calculadora de Custo por Arroba e Margem por Hectare',
    finalidade: 'apurar o custo real da arroba e a rentabilidade da área.',
    tema: 'Simuladores e calculadoras',
    texto: `Crie uma página web em português do Brasil: uma calculadora de custo por arroba e margem por hectare para pecuária de corte. Aplique o contexto comum. Objetivo: apurar o custo real de produção de uma arroba e a rentabilidade da área, com rateio configurável. Entradas: área em hectares, número de cabeças e peso médio, período em meses, custos por categoria (pastagem, suplementação, sanidade, mão de obra, combustível, manutenção, arrendamento, administração e outros), ganho de peso total do período e preço de venda da arroba. Saídas: arrobas produzidas, custo total e custo por arroba produzida, custo por cabeça/mês, receita por hectare, margem bruta por hectare, lotação em UA/ha e arrobas produzidas por hectare. Visualizações: gráfico de composição do custo em barras empilhadas; gráfico de sensibilidade mostrando a margem por hectare em diferentes preços de arroba; comparativo lado a lado entre dois cenários com destaque para o melhor resultado. Use máscara de moeda brasileira nos campos, atualização instantânea e botão para duplicar cenário.`,
  },

  // TEMA 3 — OPERAÇÃO E NUTRIÇÃO
  {
    id: 9,
    numero: 9,
    titulo: 'Calendário Anual de Safra por Frente',
    finalidade: 'visão de doze meses por frente, para planejar mão de obra, insumos e desembolso.',
    tema: 'Operação e nutrição',
    texto: `Crie uma página web em português do Brasil: um calendário anual de safra para pecuária de corte de ciclo completo, com duas frentes separadas. Aplique o contexto comum. Objetivo: dar visão de doze meses do que acontece em cada frente, permitindo planejar mão de obra, insumos e desembolso. Estrutura: duas linhas de calendário, uma para a Fazenda própria e outra para o Arrendamento, com doze colunas de meses; faixas coloridas marcando águas de outubro a março e seca de abril a setembro; marcos operacionais plotados no calendário, incluindo início e fim da estação de monta, período de IATF, diagnóstico de gestação, nascimentos, desmama, apartação, entrada e saída de lotes, confinamento, compra de insumos e formulação de suplemento; painel lateral com a lista de marcos do mês selecionado, responsável e status; bloco de carga de trabalho por mês indicando os meses de maior demanda de mão de obra; bloco de desembolso previsto por mês destacando os picos. Interatividade: clicar em um mês abre o detalhamento dos marcos daquele mês, com filtro por frente. Projete a desmama como parto mais oito meses. Layout responsivo e com impressão amigável.`,
  },
  {
    id: 10,
    numero: 10,
    titulo: 'Painel de Descarte Dirigido',
    finalidade: 'lista de matrizes candidatas ao descarte com motivo e impacto econômico.',
    tema: 'Operação e nutrição',
    texto: `Crie uma página web em português do Brasil: um painel de descarte dirigido de matrizes para um rebanho de cria. Aplique o contexto comum. Objetivo: entregar ao gestor a lista de vacas candidatas ao descarte, cada uma com o motivo objetivo e o impacto econômico estimado, deixando a decisão final para o técnico. Estrutura: cartões de topo com total de matrizes avaliadas, número de candidatas ao descarte, percentual do rebanho e custo anual estimado de manter essas matrizes; tabela principal com brinco, idade, número de partos, IEP do último ciclo, resultado do último diagnóstico de gestação, peso do último bezerro desmamado ajustado, motivo do descarte e prioridade; filtros por motivo (vazia ao final da estação, bezerro leve na desmama, IEP acima do limite, idade acima do teto de partos e histórico de problema de parto); gráfico de barras com a distribuição das candidatas por motivo; gráfico comparando o custo de manter a matriz por mais um ciclo contra o valor estimado de venda; bloco de recomendação com a lista ordenada por impacto econômico, do maior para o menor. Dados de demonstração: cerca de 1.200 matrizes avaliadas e 12% a 20% candidatas ao descarte. Rodapé com nota de que a decisão final é técnica e os dados são ilustrativos.`,
  },
  {
    id: 11,
    numero: 11,
    titulo: 'Planejador de Suplementação e Compras',
    finalidade: 'ligar o plano nutricional por fase ao consumo, estoque e desembolso.',
    tema: 'Operação e nutrição',
    texto: `Crie uma página web em português do Brasil: um planejador de suplementação e compras para uma fazenda que fabrica o próprio suplemento. Aplique o contexto comum. Objetivo: ligar o plano nutricional por fase ao consumo, ao estoque e ao desembolso de compra de insumos. Estrutura: cartões de topo com número de animais suplementados, consumo total previsto em kg/dia e toneladas no período, custo diário da suplementação e custo por arroba decorrente da suplementação; tabela de plano por fase com fase (cria, recria, terminação, seca, águas), categoria, número de cabeças, peso médio, ganho esperado em kg/dia, consumo de suplemento em gramas por cabeça por dia ou percentual do peso vivo, dias de suplementação e custo por cabeça; calculadora de fórmula com campos para milho, farelo de soja, ureia, núcleo mineral, sal e outros, com participação percentual, preço por tonelada e custo final da tonelada da mistura; gráfico de consumo previsto por mês sobreposto ao calendário de águas e seca; painel de estoque com insumo, estoque atual, consumo previsto no período, cobertura em dias e alerta de reposição; bloco de planejamento de compras com quantidade a comprar por insumo, mês sugerido de compra e desembolso previsto. Dados de demonstração: consumo entre 0,1% e 1,0% do peso vivo conforme a fase. Rodapé com nota de que a formulação final deve seguir as exigências nutricionais calculadas por profissional habilitado.`,
  },

  // TEMA 4 — INGESTÃO DE DADOS E INTELIGÊNCIA
  {
    id: 12,
    numero: 12,
    titulo: 'Central de Ingestão de Relatórios em PDF',
    finalidade:
      'demonstrar o fluxo de receber laudo em PDF, extrair dados e gerar cadastro e histórico.',
    tema: 'Ingestão de dados e inteligência',
    texto: `Crie uma página web em português do Brasil: uma central de ingestão de relatórios em PDF para gestão de pecuária de corte. Aplique o contexto comum. Objetivo: demonstrar visualmente o fluxo de receber um laudo em PDF, extrair os dados automaticamente e transformá-los em cadastro e histórico por estação de monta. Estrutura: fluxo visual em etapas no topo, com recebimento do arquivo, leitura e reconhecimento do layout, extração dos campos, validação humana e gravação no cadastro, cada etapa com ícone, status e contador; área de upload com arrastar e soltar e lista de arquivos processados com nome, tipo de documento, data e status; painel de extração que, ao selecionar um arquivo, exibe à esquerda uma representação do documento e à direita os campos extraídos (brinco, matriz, lote, data do exame, resultado prenhe ou vazia, dias de gestação, touro ou lote de IATF) com indicador de confiança por campo; fila de validação com campos de confiança baixa destacados em amarelo e botão de confirmar ou corrigir; painel de consolidação mostrando o fechamento da estação de monta com vacas expostas, prenhas, vazias e taxa de prenhez calculada; gráfico de histórico comparando a taxa de prenhez das últimas cinco estações de monta. Simule o processamento de três laudos de diagnóstico de gestação com cerca de 200 matrizes cada. Aparência de aplicação real, com animação leve nas etapas do fluxo. Rodapé com nota de que é demonstração de conceito e os dados são ilustrativos.`,
  },
  {
    id: 13,
    numero: 13,
    titulo: 'Painel de Benchmarking e Metas',
    finalidade:
      'comparar resultado atual com metas do plano de negócio, histórico próprio e referências de mercado.',
    tema: 'Ingestão de dados e inteligência',
    texto: `Crie uma página web em português do Brasil: um painel de benchmarking e metas para uma fazenda de pecuária de corte. Aplique o contexto comum. Objetivo: comparar o resultado atual da fazenda com as metas do plano de negócio, com o histórico das próprias safras e com referências de mercado. Estrutura: seletor de indicador no topo com lotação (UA/ha), GMD (kg/dia), taxa de desmame (%), mortalidade (%), arrobas por hectare e custo por arroba (R$/@); para o indicador selecionado, exibir três colunas comparativas com resultado atual, meta do plano de negócio e referência de mercado; gráfico de barras com as três colunas lado a lado e o desvio percentual destacado; gráfico de evolução do indicador nas últimas cinco safras com linha de meta sobreposta; gráfico de radar mostrando o desempenho da fazenda em todos os indicadores ao mesmo tempo, com a meta como referência; bloco de leitura com desvio, causa provável e ação corretiva sugerida para cada indicador fora da meta; bloco de priorização com os três indicadores de maior impacto econômico potencial se levados à meta, com estimativa de ganho. Deixe claro na interface que as referências de mercado são ilustrativas e devem ser substituídas por dados reais.`,
  },
]

export const TEMAS_ORDENADOS: { nome: string; quantidadeEsperada: number }[] = [
  { nome: 'Painéis de decisão', quantidadeEsperada: 5 },
  { nome: 'Simuladores e calculadoras', quantidadeEsperada: 3 },
  { nome: 'Operação e nutrição', quantidadeEsperada: 3 },
  { nome: 'Ingestão de dados e inteligência', quantidadeEsperada: 2 },
]
