/**
 * Minimal multipart/form-data parser for single-file uploads (no extra deps).
 */
export function parseMultipart(buffer, boundary) {
  const parts = [];
  const delimiter = Buffer.from(`--${boundary}`);
  const closing = Buffer.from(`--${boundary}--`);

  let offset = buffer.indexOf(delimiter);
  if (offset === -1) return parts;

  while (offset !== -1) {
    if (buffer.indexOf(closing, offset) === offset) break;

    offset += delimiter.length;
    if (buffer[offset] === 0x0d && buffer[offset + 1] === 0x0a) offset += 2;

    const next = buffer.indexOf(delimiter, offset);
    if (next === -1) break;

    let chunkEnd = next;
    if (buffer[chunkEnd - 2] === 0x0d && buffer[chunkEnd - 1] === 0x0a) {
      chunkEnd -= 2;
    }

    const chunk = buffer.subarray(offset, chunkEnd);
    const headerEnd = chunk.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      offset = next;
      continue;
    }

    const headers = chunk.subarray(0, headerEnd).toString("utf8");
    const body = chunk.subarray(headerEnd + 4);
    const disposition = headers.match(/content-disposition:[^\r\n]+/i)?.[0] ?? "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename =
      disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i)?.[1] ||
      disposition.match(/filename="([^"]+)"/i)?.[1];

    parts.push({
      name,
      filename: filename ? decodeURIComponent(filename) : null,
      data: body,
    });

    offset = next;
  }

  return parts;
}

export function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`File too large (max ${Math.floor(maxBytes / 1024 / 1024)}MB)`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
