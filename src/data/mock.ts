export const dashboardData = {
  kpis: {
    animais: 3450,
    valorTotal: 'R$ 12.450.000',
    despesasMes: 'R$ 145.200',
    receitaMes: 'R$ 320.000',
  },
  alerts: [
    {
      id: '1',
      title: 'Atenção: Orçamento de Nutrição',
      desc: 'As despesas no setor de Engorda ultrapassaram o limite previsto em 12%.',
      type: 'warning',
    },
  ],
  chartCashflow: [
    { month: 'Jan', receitas: 200, despesas: 150 },
    { month: 'Fev', receitas: 180, despesas: 130 },
    { month: 'Mar', receitas: 250, despesas: 160 },
    { month: 'Abr', receitas: 320, despesas: 145 },
    { month: 'Mai', receitas: 290, despesas: 140 },
    { month: 'Jun', receitas: 350, despesas: 155 },
  ],
  chartDistribution: [
    { name: 'Bezerras/Novilhas', value: 850, fill: 'hsl(var(--chart-1))' },
    { name: 'Vacas', value: 1200, fill: 'hsl(var(--chart-2))' },
    { name: 'Bezerros/Garrotes', value: 700, fill: 'hsl(var(--chart-3))' },
    { name: 'Bois', value: 650, fill: 'hsl(var(--chart-4))' },
    { name: 'Touros', value: 50, fill: 'hsl(var(--chart-5))' },
  ],
  activities: [
    {
      id: 1,
      action: 'Venda de 50 Bois Gordos',
      time: 'Hoje, 14:30',
      type: 'receita',
      amount: '+ R$ 250.000',
    },
    {
      id: 2,
      action: 'Compra de Insumos',
      time: 'Hoje, 09:15',
      type: 'despesa',
      amount: '- R$ 12.500',
    },
    {
      id: 3,
      action: 'Transferência Lote 04',
      time: 'Ontem, 16:00',
      type: 'movimentacao',
      amount: '120 cabeças',
    },
  ],
}

export const herdSummary = {
  entradas: 150,
  saidas: 85,
  nascimentos: 45,
  mortalidade: 2,
}

export const productionGoals = [
  {
    id: 1,
    title: 'Ganho Médio (Confinamento)',
    target: 1.5,
    current: 1.35,
    unit: 'kg/dia',
    period: 'Mensal',
  },
  { id: 2, title: 'Taxa de Prenhez', target: 85, current: 72, unit: '%', period: 'Anual' },
  {
    id: 3,
    title: 'Nascimentos na Estação',
    target: 200,
    current: 145,
    unit: 'bezerros',
    period: 'Mensal',
  },
]

export const confinementData = {
  kpis: {
    totalAnimais: 850,
    capacidade: 1000,
    consumoRacaoDiario: '12.5 ton',
    custoDiarioCabeca: 'R$ 8,50',
  },
  lotes: [
    {
      id: 'CONF-01',
      categoria: 'Bois Terminação',
      cabecas: 200,
      diasConfinamento: 45,
      pesoMedio: 480,
      dieta: 'Terminação Alto Grão',
      gmd: 1.45,
      status: 'Pronto p/ Abate',
    },
    {
      id: 'CONF-02',
      categoria: 'Garrotes Adaptação',
      cabecas: 300,
      diasConfinamento: 15,
      pesoMedio: 350,
      dieta: 'Adaptação 1',
      gmd: 0.95,
      status: 'Normal',
    },
    {
      id: 'CONF-03',
      categoria: 'Vacas Descarte',
      cabecas: 150,
      diasConfinamento: 60,
      pesoMedio: 420,
      dieta: 'Manutenção',
      gmd: 1.1,
      status: 'Normal',
    },
  ],
  dietas: [
    {
      id: 'D-01',
      nome: 'Adaptação 1',
      volumoso: '40%',
      concentrado: '60%',
      custoKg: 1.15,
      status: 'Ativa',
    },
    {
      id: 'D-02',
      nome: 'Terminação Alto Grão',
      volumoso: '15%',
      concentrado: '85%',
      custoKg: 1.45,
      status: 'Ativa',
    },
    {
      id: 'D-03',
      nome: 'Manutenção',
      volumoso: '60%',
      concentrado: '40%',
      custoKg: 0.85,
      status: 'Inativa',
    },
  ],
  inventory: [
    { id: 'I-1', item: 'Milho Moído', quantidade: 450, unidade: 'ton', status: 'Normal' },
    { id: 'I-2', item: 'Farelo de Soja', quantidade: 120, unidade: 'ton', status: 'Normal' },
    { id: 'I-3', item: 'Núcleo Mineral', quantidade: 15, unidade: 'ton', status: 'Atenção' },
    { id: 'I-4', item: 'Silagem de Milho', quantidade: 1200, unidade: 'ton', status: 'Normal' },
  ],
}

export const sectorData = {
  cria: {
    title: 'Setor: Cria',
    description: 'Gestão de matrizes, bezerros(as) ao pé e touros reprodutores.',
    kpis: {
      total: 1250,
      indicadorPrincipal: '85%',
      labelIndicador: 'Taxa de Prenhez',
      custoCabeca: 'R$ 45,00/mês',
    },
    lotes: [
      {
        id: 'LCR-01',
        categoria: 'Vacas Solteiras',
        cabecas: 120,
        pasto: 'Pasto 01',
        status: 'Saudável',
        supplement: { name: 'Sal Mineral 80', costPerKg: 3.5, consumptionPerAnimal: 0.1 },
      },
      {
        id: 'LCR-02',
        categoria: 'Vacas Paridas',
        cabecas: 85,
        pasto: 'Pasto 03',
        status: 'Atenção',
        supplement: { name: 'Sal Mineral Reprodução', costPerKg: 4.2, consumptionPerAnimal: 0.12 },
      },
      {
        id: 'LCR-03',
        categoria: 'Touros',
        cabecas: 15,
        pasto: 'Pasto 04',
        status: 'Saudável',
        supplement: { name: 'Ração Touros', costPerKg: 2.8, consumptionPerAnimal: 3.0 },
      },
      {
        id: 'LCR-04',
        categoria: 'Bezerras Desmame',
        cabecas: 140,
        pasto: 'Pasto 02',
        status: 'Saudável',
        supplement: { name: 'Ração Creep', costPerKg: 3.1, consumptionPerAnimal: 0.5 },
      },
    ],
  },
  recria: {
    title: 'Setor: Recria',
    description: 'Fase de crescimento de garrotes e novilhas.',
    kpis: {
      total: 1550,
      indicadorPrincipal: '0.6 kg',
      labelIndicador: 'GMD',
      custoCabeca: 'R$ 65,00/mês',
    },
    lotes: [
      {
        id: 'LRE-01',
        categoria: 'Garrotes',
        cabecas: 220,
        pasto: 'Pasto 05',
        status: 'Saudável',
        supplement: { name: 'Sal Proteico 0.1%', costPerKg: 2.9, consumptionPerAnimal: 0.25 },
      },
      {
        id: 'LRE-02',
        categoria: 'Novilhas 12m',
        cabecas: 180,
        pasto: 'Pasto 06',
        status: 'Saudável',
        supplement: { name: 'Sal Proteico 0.1%', costPerKg: 2.9, consumptionPerAnimal: 0.22 },
      },
    ],
  },
  engorda: {
    title: 'Setor: Engorda',
    description: 'Terminação de bois e vacas de descarte para abate.',
    kpis: {
      total: 650,
      indicadorPrincipal: '1.2 kg',
      labelIndicador: 'GMD',
      custoCabeca: 'R$ 120,00/mês',
    },
    lotes: [
      {
        id: 'LEN-01',
        categoria: 'Bois Magros',
        cabecas: 150,
        pasto: 'Confinamento A',
        status: 'Saudável',
        supplement: { name: 'Ração Confinamento', costPerKg: 1.8, consumptionPerAnimal: 8.5 },
      },
      {
        id: 'LEN-02',
        categoria: 'Bois Terminação',
        cabecas: 200,
        pasto: 'Confinamento B',
        status: 'Pronto p/ Abate',
        supplement: { name: 'Ração Confinamento', costPerKg: 1.95, consumptionPerAnimal: 11.0 },
      },
    ],
  },
}

export const pasturesData = [
  {
    id: 1,
    nome: 'Pasto 01 - Sede',
    sector: 'cria',
    area: 45.5,
    cultivar: 'Brachiaria brizantha',
    estacao: 'Águas',
    lotacaoProjetada: 2.5,
    lotacaoExecutada: 2.6,
    alturaEntradaAlvo: 30,
    alturaSaidaAlvo: 15,
    alturaAtual: 22,
    pesoMedioAtual: 215,
    pesoMedioHistorico: 205,
    status: 'Bom',
    ndvi: 0.75,
    score: 3,
    daysOfRest: 0,
    optimalRestDuration: 30,
    recommendedLotSize: 120,
    interventions: [],
  },
  {
    id: 2,
    nome: 'Pasto 02 - Fundo',
    sector: 'cria',
    area: 60.0,
    cultivar: 'Panicum maximum (Mombaça)',
    estacao: 'Águas',
    lotacaoProjetada: 3.2,
    lotacaoExecutada: 3.8,
    alturaEntradaAlvo: 90,
    alturaSaidaAlvo: 40,
    alturaAtual: 35,
    pesoMedioAtual: 285,
    pesoMedioHistorico: 295,
    status: 'Alerta',
    ndvi: 0.45,
    score: 5,
    daysOfRest: 0,
    optimalRestDuration: 35,
    recommendedLotSize: 180,
    interventions: [],
  },
  {
    id: 3,
    nome: 'Pasto 03 - Represa',
    sector: 'cria',
    area: 35.0,
    cultivar: 'Brachiaria decumbens',
    estacao: 'Seca',
    lotacaoProjetada: 0,
    lotacaoExecutada: 0,
    alturaEntradaAlvo: 25,
    alturaSaidaAlvo: 10,
    alturaAtual: 28,
    pesoMedioAtual: 0,
    pesoMedioHistorico: 0,
    status: 'Vedado',
    ndvi: 0.82,
    score: 1,
    daysOfRest: 28,
    optimalRestDuration: 30,
    recommendedLotSize: 90,
    interventions: [],
  },
]

export const inventoryData = {
  farmacia: [
    {
      id: 'F1',
      item: 'Vacina Febre Aftosa',
      tipo: 'Biológico',
      qtd: 40,
      minQtd: 100,
      unidade: 'Doses',
      status: 'Baixo',
    },
    {
      id: 'F2',
      item: 'Ivermectina 1%',
      tipo: 'Antiparasitário',
      qtd: 15,
      minQtd: 10,
      unidade: 'Frascos',
      status: 'Normal',
    },
  ],
  almoxarifado: [
    {
      id: 'A1',
      item: 'Arame Liso 17x15',
      tipo: 'Material Cerca',
      qtd: 12,
      minQtd: 10,
      unidade: 'Rolos',
      status: 'Normal',
    },
  ],
  nutricao: [
    {
      id: 'N1',
      item: 'Sal Mineral Reprodução',
      tipo: 'Suplemento',
      qtd: 1500,
      consumoDiario: 50,
      minQtd: 300,
      unidade: 'kg',
      status: 'Normal',
    },
    {
      id: 'N2',
      item: 'Ração Confinamento',
      tipo: 'Concentrado',
      qtd: 2000,
      consumoDiario: 450,
      minQtd: 1000,
      unidade: 'kg',
      status: 'Crítico',
    },
    {
      id: 'N3',
      item: 'Sal Proteico 0.1%',
      tipo: 'Suplemento',
      qtd: 800,
      consumoDiario: 65,
      minQtd: 500,
      unidade: 'kg',
      status: 'Baixo',
    },
  ],
}

export const financialData = [
  {
    id: 'TR-101',
    data: '10/Mar/2026',
    descricao: 'Venda Lote Bois Gordos',
    categoria: 'Receita Gado',
    tipo: 'entrada',
    valor: 'R$ 250.000,00',
  },
  {
    id: 'TR-102',
    data: '08/Mar/2026',
    descricao: 'Folha de Pagamento',
    categoria: 'Mão de Obra',
    tipo: 'saida',
    valor: 'R$ 45.000,00',
  },
]

export const animalData: Record<string, any> = {
  'TAG-1234': {
    id: 'TAG-1234',
    categoria: 'Garrote',
    raca: 'Nelore',
    nascimento: '15/04/2025',
    pesoAtual: '245 kg',
    lote: 'LRE-01',
    historico: [
      { data: '10/03/2026', tipo: 'Pesagem', valor: '245 kg' },
      { data: '01/12/2025', tipo: 'Vacinação', valor: 'Febre Aftosa' },
    ],
  },
}

export const sanitaryEvents = [
  {
    id: 'SAN-01',
    title: 'Vermifugação Semestral',
    date: 'Hoje',
    type: 'Manejo',
    status: 'Atrasado',
    lote: 'LCR-04',
    target: 'Bezerras Desmame',
  },
  {
    id: 'SAN-02',
    title: 'Vacinação Febre Aftosa',
    date: 'Próxima Semana',
    type: 'Vacina',
    status: 'Agendado',
    lote: 'Todos',
    target: 'Rebanho Geral',
  },
  {
    id: 'SAN-03',
    title: 'Cura de Umbigo',
    date: 'Hoje',
    type: 'Manejo',
    status: 'Atrasado',
    lote: 'LCR-02',
    target: 'Recém Nascidos',
  },
]

export const regionalProtocols = [
  {
    id: 'RP-1',
    ageGroup: 'Recém Nascidos (0-3 meses)',
    vaccine: 'Cura do Umbigo / Clostridiose',
    mandatory: 'Sim',
    frequency: 'Imediato / Dose Única',
  },
  {
    id: 'RP-2',
    ageGroup: 'Bezerros (3-8 meses)',
    vaccine: 'Brucelose (Apenas Fêmeas)',
    mandatory: 'Sim (Lei Federal)',
    frequency: 'Dose Única',
  },
  {
    id: 'RP-3',
    ageGroup: 'Rebanho Geral',
    vaccine: 'Febre Aftosa',
    mandatory: 'Depende do Estado',
    frequency: 'Semestral / Anual',
  },
  {
    id: 'RP-4',
    ageGroup: 'Rebanho Geral',
    vaccine: 'Raiva',
    mandatory: 'Recomendado',
    frequency: 'Anual',
  },
  {
    id: 'RP-5',
    ageGroup: 'Desmama (8-10 meses)',
    vaccine: 'Vermifugação Estratégica',
    mandatory: 'Recomendado',
    frequency: 'Na desmama',
  },
]

export const calendarEvents = [
  {
    id: 'EV-1',
    title: 'Vacinação Febre Aftosa',
    date: '2026-03-15',
    type: 'Sanidade',
    target: 'Lote LCR-01',
    sector: 'cria',
  },
  {
    id: 'EV-3',
    title: 'Pesagem Trimestral',
    date: '2026-03-25',
    type: 'Pesagem',
    target: 'Lote LRE-01',
    sector: 'recria',
  },
  {
    id: 'EV-5',
    title: 'Venda Frigorífico',
    date: '2026-04-10',
    type: 'Abates',
    target: 'Lote LEN-02',
    sector: 'engorda',
  },
]

export const lotPerformanceData = [
  {
    loteId: 'LCR-01',
    categoria: 'Vacas Solteiras',
    custos: 15400,
    receita: 45000,
    lucro: 29600,
    margem: '65.8%',
  },
  {
    loteId: 'LEN-02',
    categoria: 'Bois Terminação',
    custos: 85200,
    receita: 142000,
    lucro: 56800,
    margem: '40.0%',
  },
]

export const teamMembers = [
  {
    id: 'U1',
    name: 'Administrador (Sede)',
    role: 'Admin',
    email: 'admin@fazenda.com',
    status: 'Ativo',
    lastActive: 'Agora',
  },
  {
    id: 'U2',
    name: 'João (Operador Campo)',
    role: 'Operador',
    email: 'joao@fazenda.com',
    status: 'Ativo',
    lastActive: 'Há 5 min',
  },
  {
    id: 'U3',
    name: 'Carlos (Tratorista)',
    role: 'Operador',
    email: 'carlos@fazenda.com',
    status: 'Ativo',
    lastActive: 'Há 2 horas',
  },
  {
    id: 'U4',
    name: 'Ana (Veterinária)',
    role: 'Admin',
    email: 'ana@fazenda.com',
    status: 'Ausente',
    lastActive: 'Ontem',
  },
]

export const managementHistory = [
  {
    id: 'H-1',
    data: '10/Mar/2026',
    tipo: 'Nutrição',
    alvo: 'Lote LEN-01',
    descricao: 'Ajuste de dieta para Terminação Alto Grão',
    responsavel: 'João (Operador Campo)',
  },
  {
    id: 'H-2',
    data: '09/Mar/2026',
    tipo: 'Manejo de Pasto',
    alvo: 'Pasto 02 - Fundo',
    descricao: 'Aplicação de Herbicida (Folha Larga)',
    responsavel: 'Carlos (Tratorista)',
  },
  {
    id: 'H-3',
    data: '08/Mar/2026',
    tipo: 'Sanidade',
    alvo: 'Lote LCR-04',
    descricao: 'Vacinação Febre Aftosa',
    responsavel: 'Ana (Veterinária)',
  },
  {
    id: 'H-4',
    data: '05/Mar/2026',
    tipo: 'Movimentação',
    alvo: 'Lote LRE-01',
    descricao: 'Transferência do Pasto 05 para Pasto 06',
    responsavel: 'João (Operador Campo)',
  },
  {
    id: 'H-5',
    data: '02/Mar/2026',
    tipo: 'Adubação',
    alvo: 'Pasto 01 - Sede',
    descricao: 'Aplicação de Ureia (50kg/ha)',
    responsavel: 'Administrador (Sede)',
  },
]

export const costPerArrobaData = [
  {
    loteId: 'LEN-01',
    categoria: 'Bois Magros',
    custoAcumulado: 4500,
    ganhoPesoKg: 150,
    ganhoArroba: 5,
    custoPorArroba: 180,
  },
  {
    loteId: 'LEN-02',
    categoria: 'Bois Terminação',
    custoAcumulado: 8200,
    ganhoPesoKg: 210,
    ganhoArroba: 7,
    custoPorArroba: 195,
  },
]

export const reproductionForecast = [
  {
    id: 'R1',
    month: 'Setembro',
    partosPrevistos: 45,
    lote: 'LCR-01',
    status: 'Aguardando',
    vacasPrenhas: 45,
    nascimentosConfirmados: 0,
  },
  {
    id: 'R2',
    month: 'Outubro',
    partosPrevistos: 80,
    lote: 'LCR-02',
    status: 'Em andamento',
    vacasPrenhas: 85,
    nascimentosConfirmados: 5,
  },
  {
    id: 'R3',
    month: 'Novembro',
    partosPrevistos: 120,
    lote: 'LCR-03',
    status: 'Normal',
    vacasPrenhas: 125,
    nascimentosConfirmados: 0,
  },
]

export const weightGainData = [
  { name: 'Jan', pesoAtual: 210, meta: 220 },
  { name: 'Fev', pesoAtual: 235, meta: 240 },
  { name: 'Mar', pesoAtual: 250, meta: 260 },
  { name: 'Abr', pesoAtual: 280, meta: 280 },
]

export const dailyWeightData = [
  { dia: '01', gmd: 1.1, peso: 450 },
  { dia: '05', gmd: 1.2, peso: 455 },
  { dia: '10', gmd: 1.3, peso: 462 },
  { dia: '15', gmd: 1.4, peso: 469 },
  { dia: '20', gmd: 1.3, peso: 476 },
]
