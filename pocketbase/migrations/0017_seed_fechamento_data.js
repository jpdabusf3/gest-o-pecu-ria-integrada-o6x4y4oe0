migrate(
  (app) => {
    // Buscar lotes existentes para relacionamentos
    let lotCr01 = null
    let lotRe01 = null
    let lotEn01 = null
    let lotVe01 = null
    let lotAb01 = null

    try {
      lotCr01 = app.findFirstRecordByData('lots', 'name', 'Lote CR-01')
    } catch (_) {}
    try {
      lotRe01 = app.findFirstRecordByData('lots', 'name', 'Lote RE-01')
    } catch (_) {}
    try {
      lotEn01 = app.findFirstRecordByData('lots', 'name', 'Lote EN-01')
    } catch (_) {}
    try {
      lotVe01 = app.findFirstRecordByData('lots', 'name', 'Lote VE-01')
    } catch (_) {}
    try {
      lotAb01 = app.findFirstRecordByData('lots', 'name', 'Lote AB-01')
    } catch (_) {}

    // 1. COMPRAS DE GADO (Reposição)
    const comprasCol = app.findCollectionByNameOrId('compras_gado')
    const comprasData = [
      {
        data: '2024-01-15 10:00:00.000Z',
        frente: 'recria',
        lote_id: lotRe01 ? lotRe01.id : '',
        sexo: 'macho',
        qtd_cabecas: 40,
        peso_medio: 210,
        preco_rs_cab: 2300,
        preco_rs_at: 164.28,
        valor_total: 92000,
        agio_pct: 18.5,
        fornecedor: 'Fazenda Santa Tereza - Leilão',
      },
      {
        data: '2024-02-10 10:00:00.000Z',
        frente: 'engorda',
        lote_id: lotEn01 ? lotEn01.id : '',
        sexo: 'macho',
        qtd_cabecas: 35,
        peso_medio: 390,
        preco_rs_cab: 3600,
        preco_rs_at: 138.46,
        valor_total: 126000,
        agio_pct: 12.0,
        fornecedor: 'Agropecuária Rio Bonito',
      },
      {
        data: '2024-03-05 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        sexo: 'femea',
        qtd_cabecas: 25,
        peso_medio: 430,
        preco_rs_cab: 3400,
        preco_rs_at: 118.6,
        valor_total: 85000,
        agio_pct: 8.0,
        fornecedor: 'Cabanha Nelore F3',
      },
    ]

    for (const c of comprasData) {
      try {
        const rec = new Record(comprasCol)
        rec.set('data', c.data)
        rec.set('frente', c.frente)
        if (c.lote_id) rec.set('lote_id', c.lote_id)
        rec.set('sexo', c.sexo)
        rec.set('qtd_cabecas', c.qtd_cabecas)
        rec.set('peso_medio', c.peso_medio)
        rec.set('preco_rs_cab', c.preco_rs_cab)
        rec.set('preco_rs_at', c.preco_rs_at)
        rec.set('valor_total', c.valor_total)
        rec.set('agio_pct', c.agio_pct)
        rec.set('fornecedor', c.fornecedor)
        app.save(rec)
      } catch (e) {
        console.log('Seed compras_gado err:', e)
      }
    }

    // 2. VENDAS (Receitas)
    const vendasCol = app.findCollectionByNameOrId('vendas')
    const vendasData = [
      {
        data: '2024-03-20 10:00:00.000Z',
        lote_id: lotAb01 ? lotAb01.id : '',
        frente: 'engorda',
        sexo: 'macho',
        qtd_cabecas: 50,
        peso_vivo_total: 27500,
        rendimento_carcaca_pct: 54.0,
        peso_carcaca_total: 14850, // 990 @
        preco_rs_at: 245.0,
        receita_total: 242550,
        comprador: 'Frigorífico JBS - Unidade Barra do Garças',
      },
      {
        data: '2024-03-28 10:00:00.000Z',
        lote_id: lotVe01 ? lotVe01.id : '',
        frente: 'arrendamento',
        sexo: 'macho',
        qtd_cabecas: 45,
        peso_vivo_total: 9450,
        rendimento_carcaca_pct: 52.0,
        peso_carcaca_total: 4914, // 327.6 @
        preco_rs_at: 240.0,
        receita_total: 81000,
        comprador: 'Invernista Parceiro do Vale',
      },
    ]

    for (const v of vendasData) {
      try {
        const rec = new Record(vendasCol)
        rec.set('data', v.data)
        if (v.lote_id) rec.set('lote_id', v.lote_id)
        rec.set('frente', v.frente)
        rec.set('sexo', v.sexo)
        rec.set('qtd_cabecas', v.qtd_cabecas)
        rec.set('peso_vivo_total', v.peso_vivo_total)
        rec.set('rendimento_carcaca_pct', v.rendimento_carcaca_pct)
        rec.set('peso_carcaca_total', v.peso_carcaca_total)
        rec.set('preco_rs_at', v.preco_rs_at)
        rec.set('receita_total', v.receita_total)
        rec.set('comprador', v.comprador)
        app.save(rec)
      } catch (e) {
        console.log('Seed vendas err:', e)
      }
    }

    // 3. MOVIMENTAÇÕES DE REBANHO (Dinâmica Mensal: Estoque Inicial, Nascimentos, Compras, Transferências, Mortes, Vendas)
    const movCol = app.findCollectionByNameOrId('movimentacoes_rebanho')
    const movData = [
      // Janeiro 2024
      {
        data: '2024-01-05 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        tipo: 'nascimento',
        qtd_cabecas: 18,
        peso_total_kg: 630, // 35kg méd.
        valor_total_rs: 36000,
        documento: 'NASC-2024-01',
        sexo: 'macho',
        observacoes: 'Nascimentos da 1ª quinzena estação parição.',
      },
      {
        data: '2024-01-08 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        tipo: 'nascimento',
        qtd_cabecas: 16,
        peso_total_kg: 528, // 33kg méd.
        valor_total_rs: 30400,
        documento: 'NASC-2024-02',
        sexo: 'femea',
        observacoes: 'Bezerras Nelore PO/Comercial.',
      },
      {
        data: '2024-01-15 10:00:00.000Z',
        frente: 'recria',
        lote_id: lotRe01 ? lotRe01.id : '',
        tipo: 'compra',
        qtd_cabecas: 40,
        peso_total_kg: 8400,
        valor_total_rs: 92000,
        documento: 'GTA-29381-COMPRA',
        sexo: 'macho',
        observacoes: 'Entrada de garrotes compra leilão.',
      },
      {
        data: '2024-01-22 10:00:00.000Z',
        frente: 'recria',
        lote_id: lotRe01 ? lotRe01.id : '',
        tipo: 'morte',
        qtd_cabecas: 1,
        peso_total_kg: 215,
        valor_total_rs: 2300,
        documento: 'LAUDO-VET-01',
        sexo: 'macho',
        observacoes: 'Perda acidental por timpanismo agudo.',
      },
      // Fevereiro 2024
      {
        data: '2024-02-10 10:00:00.000Z',
        frente: 'engorda',
        lote_id: lotEn01 ? lotEn01.id : '',
        tipo: 'compra',
        qtd_cabecas: 35,
        peso_total_kg: 13650,
        valor_total_rs: 126000,
        documento: 'GTA-30112-COMPRA',
        sexo: 'macho',
        observacoes: 'Boi magro 13@ para engorda.',
      },
      {
        data: '2024-02-15 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        tipo: 'nascimento',
        qtd_cabecas: 12,
        peso_total_kg: 408,
        valor_total_rs: 24000,
        documento: 'NASC-2024-03',
        sexo: 'macho',
        observacoes: 'Parição tardia.',
      },
      {
        data: '2024-02-20 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        tipo: 'morte',
        qtd_cabecas: 1,
        peso_total_kg: 38,
        valor_total_rs: 2000,
        documento: 'LAUDO-VET-02',
        sexo: 'macho',
        observacoes: 'Mortalidade pré-desmame (diarreia neonatal).',
      },
      {
        data: '2024-02-25 10:00:00.000Z',
        frente: 'recria',
        lote_id: lotRe01 ? lotRe01.id : '',
        tipo: 'transferencia',
        qtd_cabecas: 20,
        peso_total_kg: 6400,
        valor_total_rs: 56000,
        documento: 'TRANSF-REC-ENG',
        sexo: 'macho',
        observacoes: 'Transferência de recria para engorda confinamento.',
      },
      // Março 2024
      {
        data: '2024-03-05 10:00:00.000Z',
        frente: 'cria',
        lote_id: lotCr01 ? lotCr01.id : '',
        tipo: 'compra',
        qtd_cabecas: 25,
        peso_total_kg: 10750,
        valor_total_rs: 85000,
        documento: 'GTA-31445-COMPRA',
        sexo: 'femea',
        observacoes: 'Reposição de matrizes precoces.',
      },
      {
        data: '2024-03-12 10:00:00.000Z',
        frente: 'confinamento',
        lote_id: lotEn01 ? lotEn01.id : '',
        tipo: 'morte',
        qtd_cabecas: 1,
        peso_total_kg: 460,
        valor_total_rs: 4200,
        documento: 'LAUDO-VET-03',
        sexo: 'macho',
        observacoes: 'Morte por acidose ruminal.',
      },
      {
        data: '2024-03-20 10:00:00.000Z',
        frente: 'engorda',
        lote_id: lotAb01 ? lotAb01.id : '',
        tipo: 'venda',
        qtd_cabecas: 50,
        peso_total_kg: 27500,
        valor_total_rs: 242550,
        documento: 'NF-FRIG-8849',
        sexo: 'macho',
        observacoes: 'Abate Frigorífico JBS.',
      },
      {
        data: '2024-03-28 10:00:00.000Z',
        frente: 'arrendamento',
        lote_id: lotVe01 ? lotVe01.id : '',
        tipo: 'venda',
        qtd_cabecas: 45,
        peso_total_kg: 9450,
        valor_total_rs: 81000,
        documento: 'NF-ARR-1022',
        sexo: 'macho',
        observacoes: 'Venda de garrotes lote arrendamento.',
      },
    ]

    for (const m of movData) {
      try {
        const rec = new Record(movCol)
        rec.set('data', m.data)
        rec.set('frente', m.frente)
        if (m.lote_id) rec.set('lote_id', m.lote_id)
        rec.set('tipo', m.tipo)
        rec.set('qtd_cabecas', m.qtd_cabecas)
        rec.set('peso_total_kg', m.peso_total_kg)
        rec.set('valor_total_rs', m.valor_total_rs)
        rec.set('documento', m.documento)
        rec.set('sexo', m.sexo)
        rec.set('observacoes', m.observacoes)
        app.save(rec)
      } catch (e) {
        console.log('Seed movimentacoes err:', e)
      }
    }

    // 4. LANÇAMENTOS FINANCEIROS POR CENTRO DE CUSTO E PLANO DE CONTAS
    const finCol = app.findCollectionByNameOrId('lancamentos_financeiros')
    const finData = [
      // Janeiro
      {
        data: '2024-01-10 10:00:00.000Z',
        centro_custo: 'recria',
        plano_contas: 'Nutrição Animal',
        classificacao: 'custo_variavel',
        tipo: 'despesa',
        valor: 14500,
        descricao: 'Suplemento mineral e proteico águas Lote RE-01',
      },
      {
        data: '2024-01-15 10:00:00.000Z',
        centro_custo: 'recria',
        plano_contas: 'Compra de Gado',
        classificacao: 'desembolso',
        tipo: 'despesa',
        valor: 92000,
        descricao: 'Compra de 40 garrotes reposição',
      },
      {
        data: '2024-01-20 10:00:00.000Z',
        centro_custo: 'administrativo',
        plano_contas: 'Honorários e Softwares',
        classificacao: 'despesa',
        tipo: 'despesa',
        valor: 4200,
        descricao: 'Software de Gestão Pecuária e assessoria zootécnica',
      },
      {
        data: '2024-01-25 10:00:00.000Z',
        centro_custo: 'frota',
        plano_contas: 'Combustíveis e Lubrificantes',
        classificacao: 'custo_fixo',
        tipo: 'despesa',
        valor: 8600,
        descricao: 'Diesel S10 para tratores e distribuição de sal',
      },
      // Fevereiro
      {
        data: '2024-02-05 10:00:00.000Z',
        centro_custo: 'confinamento',
        plano_contas: 'Ração e Insumos Concentrados',
        classificacao: 'custo_variavel',
        tipo: 'despesa',
        valor: 26800,
        descricao: 'Milho moído e farelo de soja confinamento',
      },
      {
        data: '2024-02-10 10:00:00.000Z',
        centro_custo: 'engorda',
        plano_contas: 'Compra de Gado',
        classificacao: 'desembolso',
        tipo: 'despesa',
        valor: 126000,
        descricao: 'Compra de 35 bois magros para engorda',
      },
      {
        data: '2024-02-18 10:00:00.000Z',
        centro_custo: 'cria',
        plano_contas: 'Sanidade e Vacinas',
        classificacao: 'custo_variavel',
        tipo: 'despesa',
        valor: 7400,
        descricao: 'Protocolo reprodutivo e vacinas matrizes CR-01',
      },
      {
        data: '2024-02-28 10:00:00.000Z',
        centro_custo: 'administrativo',
        plano_contas: 'Salários e Encargos da Sede',
        classificacao: 'custo_fixo',
        tipo: 'despesa',
        valor: 18500,
        descricao: 'Folha de pagamento equipe fixa fazenda',
      },
      // Março
      {
        data: '2024-03-05 10:00:00.000Z',
        centro_custo: 'cria',
        plano_contas: 'Compra de Gado',
        classificacao: 'desembolso',
        tipo: 'despesa',
        valor: 85000,
        descricao: 'Compra de 25 matrizes Nelore',
      },
      {
        data: '2024-03-15 10:00:00.000Z',
        centro_custo: 'arrendamento',
        plano_contas: 'Aluguel de Pastagens Arrendadas',
        classificacao: 'custo_fixo',
        tipo: 'despesa',
        valor: 12000,
        descricao: 'Mensalidade contrato de arrendamento pastagem Fazenda vizinha',
      },
      {
        data: '2024-03-20 10:00:00.000Z',
        centro_custo: 'engorda',
        plano_contas: 'Receita com Venda de Bovinos',
        classificacao: 'desembolso',
        tipo: 'receita',
        valor: 242550,
        descricao: 'Receita bruta abate 50 bois JBS',
      },
      {
        data: '2024-03-22 10:00:00.000Z',
        centro_custo: 'engorda',
        plano_contas: 'Frete e Impostos Funrural',
        classificacao: 'custo_variavel',
        tipo: 'despesa',
        valor: 6063, // 2.5% aprox. Funrural + Senar
        descricao: 'Retenção Funrural e frete frigorífico',
      },
      {
        data: '2024-03-28 10:00:00.000Z',
        centro_custo: 'arrendamento',
        plano_contas: 'Receita com Venda de Gado',
        classificacao: 'desembolso',
        tipo: 'receita',
        valor: 81000,
        descricao: 'Receita venda de garrotes arrendados',
      },
      {
        data: '2024-03-30 10:00:00.000Z',
        centro_custo: 'fabrica_suplemento',
        plano_contas: 'Manutenção de Moega e Misturador',
        classificacao: 'custo_fixo',
        tipo: 'despesa',
        valor: 3500,
        descricao: 'Peças de reposição e revisão misturador fábrica',
      },
      {
        data: '2024-03-31 10:00:00.000Z',
        centro_custo: 'administrativo',
        plano_contas: 'Despesas Bancárias e Juros Custeio',
        classificacao: 'despesa',
        tipo: 'despesa',
        valor: 4800,
        descricao: 'Juros de financiamento PRONAMP e tarifas bancárias',
      },
    ]

    for (const f of finData) {
      try {
        const rec = new Record(finCol)
        rec.set('data', f.data)
        rec.set('centro_custo', f.centro_custo)
        rec.set('plano_contas', f.plano_contas)
        rec.set('classificacao', f.classificacao)
        rec.set('tipo', f.tipo)
        rec.set('valor', f.valor)
        rec.set('descricao', f.descricao)
        app.save(rec)
      } catch (e) {
        console.log('Seed lancamentos err:', e)
      }
    }

    // 5. ESTOQUE DE INSUMOS COM FÓRMULA UNIVERSAL
    // Custo do período = Estoque inicial + Compras − Estoque final
    const estCol = app.findCollectionByNameOrId('estoque_insumos')
    const estData = [
      {
        produto: 'Sal Mineral Fosbov 40',
        codigo: 'N1',
        unidade: 'sacos (30kg)',
        categoria: 'nutricao',
        estoque_inicial: 200,
        entradas: 300,
        saidas: 260,
        estoque_final: 240, // 200 + 300 - 260
        preco_unitario: 95.0,
        custo_periodo: 24700, // 260 sacos * 95
        periodo_mes: '2024-03',
      },
      {
        produto: 'Ração Confinamento Terminação 18% PB',
        codigo: 'N2',
        unidade: 'kg',
        categoria: 'nutricao',
        estoque_inicial: 15000,
        entradas: 30000,
        saidas: 28000,
        estoque_final: 17000,
        preco_unitario: 1.75,
        custo_periodo: 49000, // 28000 * 1.75
        periodo_mes: '2024-03',
      },
      {
        produto: 'Vacina Aftosa Bivalente',
        codigo: 'F1',
        unidade: 'doses',
        categoria: 'sanidade',
        estoque_inicial: 100,
        entradas: 500,
        saidas: 420,
        estoque_final: 180,
        preco_unitario: 3.5,
        custo_periodo: 1470,
        periodo_mes: '2024-03',
      },
      {
        produto: 'Endectocida Ivermectina 1%',
        codigo: 'F2',
        unidade: 'frascos (500ml)',
        categoria: 'sanidade',
        estoque_inicial: 40,
        entradas: 60,
        saidas: 45,
        estoque_final: 55,
        preco_unitario: 68.0,
        custo_periodo: 3060,
        periodo_mes: '2024-03',
      },
      {
        produto: 'Diesel S10',
        codigo: 'FL-1',
        unidade: 'litros',
        categoria: 'combustivel',
        estoque_inicial: 4000,
        entradas: 8000,
        saidas: 7200,
        estoque_final: 4800,
        preco_unitario: 5.8,
        custo_periodo: 41760,
        periodo_mes: '2024-03',
      },
      {
        produto: 'Sêmen Touro Nelore PO',
        codigo: 'R-1',
        unidade: 'doses',
        categoria: 'semen',
        estoque_inicial: 180,
        entradas: 200,
        saidas: 140,
        estoque_final: 240,
        preco_unitario: 45.0,
        custo_periodo: 6300,
        periodo_mes: '2024-03',
      },
    ]

    for (const s of estData) {
      try {
        const rec = new Record(estCol)
        rec.set('produto', s.produto)
        rec.set('codigo', s.codigo)
        rec.set('unidade', s.unidade)
        rec.set('categoria', s.categoria)
        rec.set('estoque_inicial', s.estoque_inicial)
        rec.set('entradas', s.entradas)
        rec.set('saidas', s.saidas)
        rec.set('estoque_final', s.estoque_final)
        rec.set('preco_unitario', s.preco_unitario)
        rec.set('custo_periodo', s.custo_periodo)
        rec.set('periodo_mes', s.periodo_mes)
        app.save(rec)
      } catch (e) {
        console.log('Seed estoque err:', e)
      }
    }

    // 6. IMOBILIZADO E DEPRECIAÇÃO ANUAL APROPRIADA NA DRE
    const imoCol = app.findCollectionByNameOrId('imobilizado')
    const imoData = [
      {
        descricao: 'Trator John Deere 6110J com Pá Carregadeira',
        tipo: 'tratores',
        vida_util_anos: 10,
        valor_residual_pct: 20, // 20% residual
        valor_imobilizado: 380000,
        depreciacao_anual: 30400, // (380.000 * 0.8) / 10 = 30.400/ano
        data_aquisicao: '2021-05-10 10:00:00.000Z',
        centro_custo: 'frota',
      },
      {
        descricao: 'Vagão Misturador e Distribuidor de Ração Casale 8m³',
        tipo: 'maquinas',
        vida_util_anos: 8,
        valor_residual_pct: 15,
        valor_imobilizado: 185000,
        depreciacao_anual: 19656, // (185.000 * 0.85) / 8 = 19.656/ano
        data_aquisicao: '2022-03-15 10:00:00.000Z',
        centro_custo: 'confinamento',
      },
      {
        descricao: 'Curral Anti-estresse Completo com Tronco e Balança Coimma',
        tipo: 'edificacoes',
        vida_util_anos: 25,
        valor_residual_pct: 10,
        valor_imobilizado: 420000,
        depreciacao_anual: 15120, // (420.000 * 0.9) / 25 = 15.120/ano
        data_aquisicao: '2020-01-20 10:00:00.000Z',
        centro_custo: 'administrativo',
      },
      {
        descricao: 'Caminonete Hilux 4x4 Operacional Campo',
        tipo: 'veiculos',
        vida_util_anos: 5,
        valor_residual_pct: 25,
        valor_imobilizado: 240000,
        depreciacao_anual: 36000, // (240.000 * 0.75) / 5 = 36.000/ano
        data_aquisicao: '2022-08-10 10:00:00.000Z',
        centro_custo: 'frota',
      },
      {
        descricao: 'Galpão Fábrica de Ração e Almoxarifado 600m²',
        tipo: 'edificacoes',
        vida_util_anos: 30,
        valor_residual_pct: 10,
        valor_imobilizado: 350000,
        depreciacao_anual: 10500, // (350.000 * 0.9) / 30 = 10.500/ano
        data_aquisicao: '2019-06-01 10:00:00.000Z',
        centro_custo: 'fabrica_suplemento',
      },
      {
        descricao: 'Formação e Divisão de Pastagens Rotacionadas 120 ha',
        tipo: 'pastagens',
        vida_util_anos: 12,
        valor_residual_pct: 0,
        valor_imobilizado: 280000,
        depreciacao_anual: 23333,
        data_aquisicao: '2021-11-01 10:00:00.000Z',
        centro_custo: 'recria',
      },
    ]

    for (const im of imoData) {
      try {
        const rec = new Record(imoCol)
        rec.set('descricao', im.descricao)
        rec.set('tipo', im.tipo)
        rec.set('vida_util_anos', im.vida_util_anos)
        rec.set('valor_residual_pct', im.valor_residual_pct)
        rec.set('valor_imobilizado', im.valor_imobilizado)
        rec.set('depreciacao_anual', im.depreciacao_anual)
        rec.set('data_aquisicao', im.data_aquisicao)
        rec.set('centro_custo', im.centro_custo)
        app.save(rec)
      } catch (e) {
        console.log('Seed imobilizado err:', e)
      }
    }
  },
  (app) => {
    // Reversão
    try {
      const records = app.findRecordsByFilter('imobilizado', '', '', 100, 0)
      for (const r of records) app.delete(r)
    } catch (_) {}
  },
)
