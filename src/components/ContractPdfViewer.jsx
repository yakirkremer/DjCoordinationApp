import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ensurePdfWorker } from "../lib/pdfjsSetup";

const RENDER_SCALE = 1.4;

export default function ContractPdfViewer({
  fileUrl,
  className = "",
  placingType = null,
  onPageClick,
  children,
  fitToWidth = false,
}) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overlayReady, setOverlayReady] = useState(false);
  const pageContainersRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPages([]);
    setOverlayReady(false);
    pageContainersRef.current = {};

    (async () => {
      try {
        const res = await fetch(fileUrl, { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";

        if (!res.ok) {
          if (contentType.includes("application/json")) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to load contract file (${res.status})`);
          }
          throw new Error(`Failed to load contract file (${res.status})`);
        }

        if (!contentType.includes("pdf")) {
          throw new Error("Contract file not found — re-upload the PDF template");
        }

        const buffer = await res.arrayBuffer();
        const { getDocument } = ensurePdfWorker();
        const pdf = await getDocument({ data: buffer }).promise;
        const rendered = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
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

  useLayoutEffect(() => {
    setOverlayReady(pages.length > 0);
  }, [pages]);

  const bindPageRef = useCallback((pageIndex) => {
    return (el) => {
      if (el) {
        pageContainersRef.current[pageIndex] = el;
      }
    };
  }, []);

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
          ref={bindPageRef(page.index)}
          className={`contract-pdf-page${placingType ? " is-placing" : ""}${
            fitToWidth ? " contract-pdf-page--fit" : ""
          }`}
          style={
            fitToWidth
              ? { aspectRatio: `${page.width} / ${page.height}` }
              : { width: page.width, height: page.height }
          }
          onClick={(e) => {
            if (!placingType || !onPageClick) return;
            if (e.target.closest(".contract-field-marker")) return;
            const container = pageContainersRef.current[page.index];
            if (container) onPageClick(e, page.index, container);
          }}
        >
          <img
            src={page.dataUrl}
            alt={`עמוד ${page.index + 1}`}
            className="contract-pdf-page-img"
            {...(fitToWidth ? {} : { width: page.width, height: page.height })}
            draggable={false}
          />
          {overlayReady ? children?.(page.index, pageContainersRef.current[page.index]) : null}
        </div>
      ))}
    </div>
  );
}
