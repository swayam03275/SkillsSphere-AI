import html2pdf from 'html2pdf.js';

/**
 * Exports an array of objects to a CSV file.
 * @param {string} filename The name of the file to download (e.g., "report.csv").
 * @param {Array<Object>} rows The data to export.
 */
export const exportToCSV = (filename, rows) => {
  if (!rows || !rows.length) {
    console.warn('No data to export');
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Captures an HTML element and exports it as a PDF.
 * @param {string} elementId The ID of the HTML element to capture.
 * @param {string} filename The name of the PDF file to download (e.g., "report.pdf").
 */
export const exportToPDF = async (elementId, filename, options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID ${elementId} not found.`);
  }
  const opt = {
    margin:       0.2,
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
    ...options,
  };
  
  return html2pdf().set(opt).from(element).save();
};
