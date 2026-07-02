import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker";

let workerReady = false;

export function ensurePdfWorker() {
  if (workerReady) return pdfjs;
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  workerReady = true;
  return pdfjs;
}

export { pdfjs };
