import fs from 'fs'

const files = [
  'src/assets/relatrio-final-iatf-faz.sto-antonio-e.m.25-26-2-7a65c.pdf',
  'src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf',
  'src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf',
]

fs.writeFileSync(
  'scripts/extracted_status.json',
  JSON.stringify(
    {
      processedAt: new Date().toISOString(),
      files: files.map((f) => ({ name: f, size: fs.statSync(f).size })),
    },
    null,
    2,
  ),
)
