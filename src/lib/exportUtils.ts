/**
 * Utility functions for exporting data across the application.
 */

export function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header]
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val !== null && val !== undefined ? val : ''
        })
        .join(','),
    ),
  ]

  const csvContent = csvRows.join('\n')
  // Add BOM for Excel to properly read UTF-8
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadExcel(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  let table =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table><thead><tr>'

  headers.forEach((h) => {
    table += `<th style="background-color: #f3f4f6; font-weight: bold; border: 1px solid #ccc; padding: 4px;">${h}</th>`
  })
  table += '</tr></thead><tbody>'

  data.forEach((row) => {
    table += '<tr>'
    headers.forEach((h) => {
      const val = row[h] !== null && row[h] !== undefined ? row[h] : ''
      table += `<td style="border: 1px solid #ccc; padding: 4px;">${val}</td>`
    })
    table += '</tr>'
  })
  table += '</tbody></table></body></html>'

  const blob = new Blob([table], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function triggerPDFPrint() {
  window.print()
}

export function printWithHeader(title: string, farmName?: string) {
  const originalTitle = document.title
  document.title = `${farmName || 'Gestão Pecuária Integrada'} - ${title}`
  window.print()
  setTimeout(() => {
    document.title = originalTitle
  }, 500)
}
