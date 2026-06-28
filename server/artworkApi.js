import { sendJson } from "./dataStore.js";
import { fetchArtworkForCatalog, fetchArtworkForTrack } from "./artworkFetch.js";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export async function handleFetchArtwork(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }

  const force = body.force === true;

  try {
    if (body.trackId) {
      const result = await fetchArtworkForTrack(body.trackId, { force });
      sendJson(res, 200, result);
      return;
    }

    const result = await fetchArtworkForCatalog({ force });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Artwork fetch failed" });
  }
}

export function createArtworkApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/admin/fetch-artwork" && req.method === "POST") {
      handleFetchArtwork(req, res);
      return;
    }
    next();
  };
}
