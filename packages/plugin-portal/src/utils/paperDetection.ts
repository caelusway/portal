// Stub for analyzeScientificPdf
export function analyzeScientificPdf(filename: string, size: number) {
  // In production, implement real PDF analysis
  return {
    confidence: 0.9,
    isScientificPaper: filename.endsWith('.pdf'),
    reason: 'Stubbed: always returns true for .pdf',
  };
}

// Stub for detectPaper
export function detectPaper(content: string, hasAttachment: boolean) {
  // In production, implement real detection logic
  return content.toLowerCase().includes('paper') || hasAttachment;
}
