// app/pdfViewer.js
import React from 'react';
// The bundler automatically appends .web.js or .native.js
import PDFViewImplementation from '../components/PDFView'; 

export default function PDFViewerPage() {
  return <PDFViewImplementation />;
}