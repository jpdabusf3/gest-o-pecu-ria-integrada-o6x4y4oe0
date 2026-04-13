migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lots')

    if (!col.fields.getByName('sector')) {
      col.fields.add(
        new SelectField({
          name: 'sector',
          values: ['cria', 'recria', 'engorda', 'venda'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('sex')) {
      col.fields.add(new SelectField({ name: 'sex', values: ['macho', 'femea'], maxSelect: 1 }))
    }
    if (!col.fields.getByName('category')) {
      col.fields.add(new TextField({ name: 'category' }))
    }
    if (!col.fields.getByName('initial_weight')) {
      col.fields.add(new NumberField({ name: 'initial_weight' }))
    }
    if (!col.fields.getByName('final_weight')) {
      col.fields.add(new NumberField({ name: 'final_weight' }))
    }
    if (!col.fields.getByName('entry_date')) {
      col.fields.add(new DateField({ name: 'entry_date' }))
    }
    if (!col.fields.getByName('exit_date')) {
      col.fields.add(new DateField({ name: 'exit_date' }))
    }
    if (!col.fields.getByName('value_per_animal')) {
      col.fields.add(new NumberField({ name: 'value_per_animal' }))
    }
    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({ name: 'status', values: ['active', 'sold', 'abated'], maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('headcount')) {
      col.fields.add(new NumberField({ name: 'headcount' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('lots')
    col.fields.removeByName('sector')
    col.fields.removeByName('sex')
    col.fields.removeByName('category')
    col.fields.removeByName('initial_weight')
    col.fields.removeByName('final_weight')
    col.fields.removeByName('entry_date')
    col.fields.removeByName('exit_date')
    col.fields.removeByName('value_per_animal')
    col.fields.removeByName('status')
    col.fields.removeByName('headcount')
    app.save(col)
  },
)
