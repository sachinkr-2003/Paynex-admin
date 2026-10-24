/**
 * Utility to export JavaScript data arrays directly to CSV (compatible with Microsoft Excel)
 * Uses UTF-8 BOM (\uFEFF) so Excel opens Hindi, currency symbols, and numbers without encoding issues.
 */
export function exportToExcel(filename, headers, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export to Excel.');
    return;
  }

  // Header row
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const dataLines = rows.map((row) => {
    return headers
      .map((h) => {
        let val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.accessor];
        if (val === undefined || val === null) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
