export function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header];
        cell = cell.toString().replace(/"/g, '""'); // Escape double quotes
        return `"${cell}"`; // Wrap in double quotes
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}