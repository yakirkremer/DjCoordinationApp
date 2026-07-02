import React, { useEffect, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const RENDER_SCALE = 1.4;

export default function ContractPdfViewer({
  fileUrl,
  className = "",
  placingType = null,
  onPageClick,
  children,
}) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageContainers, setPageContainers] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPages([]);

    (async () => {
      try {
        const pdf = await getDocument({ url: fileUrl, withCredentials: true }).promise;
        const rendered = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({
            index: pageNum - 1,
            width: viewport.width,
            height: viewport.height,
            dataUrl: canvas.toDataURL("image/png"),
          });
        }

        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (loading) {
    return <p className="contract-pdf-loading text-sm text-gray-400 p-6 text-center">טוען PDF…</p>;
  }

  if (error) {
    return <p className="contract-pdf-error text-sm text-red-400 p-6 text-center">{error}</p>;
  }

  return (
    <div className={`contract-pdf-pages ${className}`}>
      {pages.map((page) => (
        <div
          key={page.index}
          ref={(el) => {
            if (el) {
              setPageContainers((prev) =>
                prev[page.index] === el ? prev : { ...prev, [page.index]: el }
              );
            }
          }}
          className={`contract-pdf-page${placingType ? " is-placing" : ""}`}
          style={{ width: page.width, height: page.height }}
          onClick={(e) => {
            if (!placingType || !onPageClick) return;
            if (e.target.closest(".contract-field-marker")) return;
            const container = pageContainers[page.index];
            if (container) onPageClick(e, page.index, container);
          }}
        >
          <img
            src={page.dataUrl}
            alt={`עמוד ${page.index + 1}`}
            className="contract-pdf-page-img"
            width={page.width}
            height={page.height}
            draggable={false}
          />
          {children?.(page.index, pageContainers[page.index])}
        </div>
      ))}
    </div>
  );
}
