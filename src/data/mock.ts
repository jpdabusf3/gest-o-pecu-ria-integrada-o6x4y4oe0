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
    { name: 'Bezerras', value: 850, fill: 'hsl(var(--chart-1))' },
    { name: 'Vacas (Matrizes)', value: 900, fill: 'hsl(var(--chart-2))' },
    { name: 'Vacas de corte', value: 300, fill: 'hsl(var(--chart-3))' },
    { name: 'Bezerros', value: 700, fill: 'hsl(var(--chart-4))' },
    { name: 'Bois', value: 650, fill: 'hsl(var(--chart-5))' },
    { name: 'Novilhas', value: 200, fill: 'hsl(var(--chart-1))' },
    { name: 'Novilhas matrizes', value: 150, fill: 'hsl(var(--chart-2))' },
    { name: 'Garrotes', value: 300, fill: 'hsl(var(--chart-3))' },
    { name: 'Touros', value: 50, fill: 'hsl(var(--chart-4))' },
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
      curral: 'Baia 01',
      categoria: 'Bois Terminação',
      cabecas: 200,
      diasConfinamento: 45,
      pesoMedio: 480,
      dieta: 'Terminação Alto Grão',
      gmd: 1.45,
      consumoPercentual: 2.2,
      consumoKg: 10.56,
      status: 'Pronto p/ Abate',
    },
    {
      id: 'CONF-02',
      curral: 'Baia 02',
      categoria: 'Garrotes Adaptação',
      cabecas: 300,
      diasConfinamento: 15,
      pesoMedio: 350,
      dieta: 'Adaptação 1',
      gmd: 0.95,
      consumoPercentual: 2.0,
      consumoKg: 7.0,
      status: 'Normal',
    },
    {
      id: 'CONF-03',
      curral: 'Baia 03',
      categoria: 'Vacas Descarte',
      cabecas: 150,
      diasConfinamento: 60,
      pesoMedio: 420,
      dieta: 'Manutenção',
      gmd: 1.1,
      consumoPercentual: 1.8,
      consumoKg: 7.56,
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
        taxaPrenhez: '88%',
        previsaoParto: '-',
        supplement: { name: 'Sal Mineral 80', costPerKg: 3.5, consumptionPerAnimal: 0.1 },
      },
      {
        id: 'LCR-02',
        categoria: 'Vacas Paridas',
        cabecas: 85,
        pasto: 'Pasto 03',
        status: 'Atenção',
        taxaPrenhez: '-',
        previsaoParto: 'Set/2026',
        supplement: { name: 'Sal Mineral Reprodução', costPerKg: 4.2, consumptionPerAnimal: 0.12 },
      },
      {
        id: 'LCR-03',
        categoria: 'Touros',
        cabecas: 15,
        pasto: 'Pasto 04',
        status: 'Saudável',
        taxaPrenhez: '-',
        previsaoParto: '-',
        supplement: { name: 'Ração Touros', costPerKg: 2.8, consumptionPerAnimal: 3.0 },
      },
      {
        id: 'LCR-04',
        categoria: 'Bezerras Desmame',
        cabecas: 140,
        pasto: 'Pasto 02',
        status: 'Saudável',
        taxaPrenhez: '-',
        previsaoParto: '-',
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
        pesoEntrada: 180,
        pesoAtual: 245,
        gmdAtual: 0.65,
        diasPasto: 100,
        supplement: { name: 'Sal Proteico 0.1%', costPerKg: 2.9, consumptionPerAnimal: 0.25 },
      },
      {
        id: 'LRE-02',
        categoria: 'Novilhas 12m',
        cabecas: 180,
        pasto: 'Pasto 06',
        status: 'Saudável',
        pesoEntrada: 175,
        pesoAtual: 220,
        gmdAtual: 0.6,
        diasPasto: 75,
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
        pesoEntrada: 360,
        pesoAtual: 420,
        gmdPrevisto: 1.45,
        dieta: 'Adaptação',
        supplement: { name: 'Ração Confinamento', costPerKg: 1.8, consumptionPerAnimal: 8.5 },
      },
      {
        id: 'LEN-02',
        categoria: 'Bois Terminação',
        cabecas: 200,
        pasto: 'Confinamento B',
        status: 'Pronto p/ Abate',
        pesoEntrada: 430,
        pesoAtual: 535,
        gmdPrevisto: 1.55,
        dieta: 'Alto Grão',
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
    ocupanteAtual: 'LCR-01',
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
    ocupanteAtual: 'LCR-04',
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
    ocupanteAtual: null,
  },
  {
    id: 4,
    nome: 'Pasto 04 - Baixada',
    sector: 'recria',
    area: 50.0,
    cultivar: 'Brachiaria brizantha',
    estacao: 'Águas',
    lotacaoProjetada: 2.0,
    lotacaoExecutada: 0,
    alturaEntradaAlvo: 30,
    alturaSaidaAlvo: 15,
    alturaAtual: 32,
    pesoMedioAtual: 0,
    pesoMedioHistorico: 0,
    status: 'Vedado',
    ndvi: 0.88,
    score: 5,
    daysOfRest: 45,
    optimalRestDuration: 30,
    recommendedLotSize: 150,
    interventions: [],
    ocupanteAtual: null,
  },
  {
    id: 5,
    nome: 'Pasto 05 - Morro',
    sector: 'recria',
    area: 80.0,
    cultivar: 'Andropogon',
    estacao: 'Águas',
    lotacaoProjetada: 1.5,
    lotacaoExecutada: 1.4,
    alturaEntradaAlvo: 40,
    alturaSaidaAlvo: 20,
    alturaAtual: 25,
    pesoMedioAtual: 310,
    pesoMedioHistorico: 300,
    status: 'Bom',
    ndvi: 0.7,
    score: 3,
    daysOfRest: 0,
    optimalRestDuration: 40,
    recommendedLotSize: 120,
    interventions: [],
    ocupanteAtual: 'LRE-01',
  },
]

export const rotationalSchedule = [
  {
    id: 'R1',
    pastoId: 3,
    pastoNome: 'Pasto 03 - Represa',
    nextLot: 'LCR-02',
    entryDate: '15/03/2026',
    requiredRest: 30,
    currentRest: 28,
    nutritionReq: 'Sal Mineral Reprodução (0.12kg/dia)',
  },
  {
    id: 'R2',
    pastoId: 4,
    pastoNome: 'Pasto 04 - Baixada',
    nextLot: 'LRE-02',
    entryDate: '10/03/2026',
    requiredRest: 30,
    currentRest: 45,
    nutritionReq: 'Sal Proteico 0.1% (0.22kg/dia)',
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
      custoUnitario: 1.5,
    },
    {
      id: 'F2',
      item: 'Ivermectina 1%',
      tipo: 'Antiparasitário',
      qtd: 15,
      minQtd: 10,
      unidade: 'Frascos',
      status: 'Normal',
      custoUnitario: 45.0,
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
      custoUnitario: 450.0,
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
      custoUnitario: 3.5,
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
      custoUnitario: 1.8,
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
      custoUnitario: 2.9,
    },
    {
      id: 'M1',
      item: 'Milho em Grão',
      tipo: 'Materia Prima',
      qtd: 50000,
      minQtd: 10000,
      unidade: 'kg',
      status: 'Normal',
      custoUnitario: 0.8,
    },
    {
      id: 'M2',
      item: 'Farelo de Soja',
      tipo: 'Materia Prima',
      qtd: 15000,
      minQtd: 5000,
      unidade: 'kg',
      status: 'Normal',
      custoUnitario: 2.2,
    },
    {
      id: 'M3',
      item: 'Núcleo Mineral Confinamento',
      tipo: 'Materia Prima',
      qtd: 2000,
      minQtd: 500,
      unidade: 'kg',
      status: 'Normal',
      custoUnitario: 4.5,
    },
  ],
}

export const supplierPerformanceData = [
  { brand: 'AgroMix (Ração)', type: 'Ração Confinamento', gmd: 1.55, costPerKg: 1.85 },
  { brand: 'NutriMax (Ração)', type: 'Ração Confinamento', gmd: 1.48, costPerKg: 1.7 },
  { brand: 'BoiForte (Ração)', type: 'Ração Confinamento', gmd: 1.42, costPerKg: 1.65 },
  { brand: 'SalMine (Mineral)', type: 'Suplemento Mineral', gmd: 0.65, costPerKg: 3.5 },
  { brand: 'ForteSal (Mineral)', type: 'Suplemento Mineral', gmd: 0.6, costPerKg: 3.2 },
  { brand: 'OuroFino (Mineral)', type: 'Suplemento Mineral', gmd: 0.68, costPerKg: 3.8 },
]

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

export const productionCostDashboard = {
  totalArrobasProduced: 1250,
  totalCost: 295000,
  costPerArroba: 236.0,
  costs: [
    { name: 'Nutrição & Suplementos', value: 155000, fill: 'hsl(var(--chart-1))' },
    { name: 'Mão de Obra & Bônus', value: 55000, fill: 'hsl(var(--chart-2))' },
    { name: 'Maquinário & Frota', value: 35000, fill: 'hsl(var(--chart-5))' },
    { name: 'Sanidade & Protocolos', value: 32000, fill: 'hsl(var(--chart-3))' },
    { name: 'Manutenção de Pastagem', value: 18000, fill: 'hsl(var(--chart-4))' },
  ],
}

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
    lastActive: 'Há 2 hours',
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
    hora: '08:30',
    tipo: 'Nutrição',
    alvo: 'Lote LEN-01',
    descricao: 'Ajuste de dieta para Terminação Alto Grão',
    responsavel: 'João (Operador Campo)',
    observacoes:
      'Animais aceitaram bem a nova formulação. Consumo esperado ajustado para 2.2% do PV.',
    custoCabeca: 1.45,
    insumosUtilizados: ['Milho Moído (45%)', 'Farelo de Soja (15%)', 'Núcleo Mineral (5%)'],
    animaisEnvolvidos: '150 cabeças (Bois Magros)',
  },
  {
    id: 'H-2',
    data: '09/Mar/2026',
    hora: '14:15',
    tipo: 'Manejo de Pasto',
    alvo: 'Pasto 02 - Fundo',
    descricao: 'Aplicação de Herbicida (Folha Larga)',
    responsavel: 'Carlos (Tratorista)',
    observacoes: 'Aplicação realizada com tempo bom, sem vento. Área total coberta.',
    custoCabeca: null,
    insumosUtilizados: ['Herbicida Tordon 2L/ha'],
    animaisEnvolvidos: 'Nenhum (Pasto Vedado temporariamente)',
  },
  {
    id: 'H-3',
    data: '08/Mar/2026',
    hora: '09:00',
    tipo: 'Sanidade',
    alvo: 'Lote LCR-04',
    descricao: 'Vacinação Febre Aftosa e Vermifugação',
    responsavel: 'Ana (Veterinária)',
    observacoes:
      'Lote em ótimo estado sanitário. 3 animais precisaram de reforço no curativo de umbigo.',
    custoCabeca: 4.5,
    insumosUtilizados: ['Vacina Aftosa (140 doses)', 'Ivermectina 1% (140 doses)'],
    animaisEnvolvidos: '140 cabeças (Bezerras Desmame)',
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

export const farmRegistry = {
  nome: 'Fazenda Vale do Sol',
  proprietario: 'Grupo Agro GPI',
  cnpj: '12.345.678/0001-90',
  inscricaoEstadual: '123.456.789.000',
  car: 'SP-1234567-ABCD.EFGH.IJKL',
  endereco: 'Rodovia BR-123, Km 45, Zona Rural',
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  areaTotal: 1500,
  areaPastagem: 1200,
  areaReserva: 300,
}

export const businessContacts = [
  {
    id: 'C1',
    nome: 'Frigorífico Boi Forte',
    categoria: 'Comprador',
    contato: '(11) 99999-1111',
    email: 'compras@boiforte.com',
    empresa: 'Boi Forte SA',
    status: 'Ativo',
  },
  {
    id: 'C2',
    nome: 'AgroInsumos Certo',
    categoria: 'Fornecedor',
    contato: '(16) 88888-2222',
    email: 'vendas@agroinsumos.com',
    empresa: 'AgroInsumos Ltda',
    status: 'Ativo',
  },
  {
    id: 'C3',
    nome: 'Laboratórios VidaVet',
    categoria: 'Laboratório',
    contato: '(16) 77777-3333',
    email: 'contato@vidavet.com.br',
    empresa: 'VidaVet S.A',
    status: 'Ativo',
  },
]

export const fleetData = [
  {
    id: 'M1',
    name: 'Trator John Deere 5090',
    type: 'Trator',
    acquisitionValue: 250000,
    currentHours: 1200,
    currentKm: null,
    fuelConsumption: 450,
    maintenanceCost: 4500,
    depreciation: 12500,
    status: 'Ativo',
  },
]

export const employeePerformance = [
  {
    employeeId: 'U1',
    name: 'Administrador (Sede)',
    points: 450,
    bonusEstimate: 4500,
    goalsAchieved: 4,
  },
]

export const performanceGoalsList = [
  { id: 'G1', title: 'Mortalidade < 2% ao ano na recria', points: 100 },
  { id: 'G3', title: 'GMD Confinamento > 1.4kg/dia no lote total', points: 150 },
]

export const biMetricsList = [
  { id: 'ganhoPeso', name: 'GMD Médio Rebanho', color: 'hsl(var(--chart-1))', unit: 'kg' },
  { id: 'custoCombustivel', name: 'Custo Combustível', color: 'hsl(var(--chart-2))', unit: 'R$' },
]

export const biData = [
  { period: 'Out/25', ganhoPeso: 1.1, custoCombustivel: 4500, arrobaPrice: 250, taxaPrenhez: 70 },
  { period: 'Nov/25', ganhoPeso: 1.15, custoCombustivel: 4800, arrobaPrice: 255, taxaPrenhez: 75 },
]

export const twelveMonthsTrendData = [
  { month: 'Abr', cashflow: 120000, weightGain: 200 },
  { month: 'Mai', cashflow: 135000, weightGain: 220 },
]

export const defaultSavedReports = [
  { id: '1', name: 'Ganho vs Combustível', m1: 'ganhoPeso', m2: 'custoCombustivel' },
]

export const performanceByCategory: Record<string, any[]> = {
  Bois: [
    { period: 'Out', gmd: 1.1 },
    { period: 'Nov', gmd: 1.2 },
    { period: 'Dez', gmd: 1.3 },
    { period: 'Jan', gmd: 1.35 },
    { period: 'Fev', gmd: 1.4 },
    { period: 'Mar', gmd: 1.45 },
  ],
  'Vacas de corte': [
    { period: 'Out', gmd: 0.8 },
    { period: 'Nov', gmd: 0.85 },
    { period: 'Dez', gmd: 0.9 },
    { period: 'Jan', gmd: 0.95 },
    { period: 'Fev', gmd: 1.0 },
    { period: 'Mar', gmd: 1.1 },
  ],
}

export const savedCustomSimulations = [
  {
    id: 'sim-1',
    name: 'Cenário Alta 2026',
    basePrice: 280,
    targetWeight: 540,
    dietCostPerDay: 8.5,
  },
]

export const performanceCorrelationData = [
  { loteId: 'LCR-01', ganhoPeso: 0.8, custoCabeca: 45.0, ndvi: 0.75, conversaoAlimentar: 6.5 },
  { loteId: 'LRE-01', ganhoPeso: 1.1, custoCabeca: 65.0, ndvi: 0.7, conversaoAlimentar: 5.8 },
  { loteId: 'LEN-02', ganhoPeso: 1.6, custoCabeca: 125.0, ndvi: null, conversaoAlimentar: 5.0 },
]

export const iatfProtocols = [
  {
    id: 'IATF-1',
    lote: 'LCR-01',
    tipo: 'Convencional 3 Manejos',
    inicio: '01/03/2026',
    inseminacao: '11/03/2026',
    dg: '10/04/2026',
    dgFinal: '-',
    proximoManejo: '10/04/2026 - Toque DG',
    status: 'Aguardando DG',
  },
  {
    id: 'IATF-2',
    lote: 'LCR-02',
    tipo: 'J-Synch',
    inicio: '15/01/2026',
    inseminacao: '25/01/2026',
    dg: '25/02/2026',
    dgFinal: '15/04/2026',
    proximoManejo: '-',
    status: 'Finalizado (Prenhez 85%)',
  },
]

export const bullsData = [
  { id: 'B-1', nome: 'Fajardo', raca: 'Nelore', central: 'Alta Genetics', doses: 150 },
  { id: 'B-2', nome: 'Backup', raca: 'Nelore', central: 'CRV Lagoa', doses: 80 },
  { id: 'B-3', nome: 'Bitelo', raca: 'Nelore', central: 'ABS', doses: 45 },
]

export const bullUsageDistribution = [
  { name: 'Fajardo', value: 350, fill: 'hsl(var(--chart-1))' },
  { name: 'Backup', value: 200, fill: 'hsl(var(--chart-2))' },
  { name: 'Bitelo', value: 150, fill: 'hsl(var(--chart-3))' },
]

export const benchmarkingData = {
  'LRE-01': [
    { periodo: 'Seca 2025 (Jul-Set)', dieta: 'Sal Proteico 0.1%', gmd: 0.45, ganhoTotal: 40 },
    { periodo: 'Águas 2025 (Out-Dez)', dieta: 'Sal Mineral', gmd: 0.75, ganhoTotal: 65 },
    { periodo: 'Transição 2026 (Jan-Mar)', dieta: 'Ração 0.3%', gmd: 0.85, ganhoTotal: 75 },
  ],
  'LEN-01': [
    { periodo: 'Pasto (Jan-Fev)', dieta: 'Sal Mineral', gmd: 0.6, ganhoTotal: 36 },
    { periodo: 'Adaptação (Março)', dieta: 'Adaptação 1', gmd: 1.1, ganhoTotal: 33 },
    { periodo: 'Terminação (Abr-Mai)', dieta: 'Alto Grão', gmd: 1.55, ganhoTotal: 93 },
  ],
}
