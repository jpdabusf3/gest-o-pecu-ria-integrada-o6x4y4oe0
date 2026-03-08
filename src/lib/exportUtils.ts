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

export function triggerPDFPrint() {
  window.print()
}
