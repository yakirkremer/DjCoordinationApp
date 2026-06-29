import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeAppPath, parseAppPath } from "../lib/appRoutes";

function readBrowserPath() {
  return normalizeAppPath(window.location.pathname);
}

export default function useAppRouter() {
  const [pathname, setPathname] = useState(readBrowserPath);

  useEffect(() => {
    const onPopState = () => setPathname(readBrowserPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const route = useMemo(() => parseAppPath(pathname), [pathname]);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const next = normalizeAppPath(to);
    const current = readBrowserPath();
    if (next === current) {
      setPathname(next);
      return;
    }
    if (replace) {
      window.history.replaceState(null, "", next);
    } else {
      window.history.pushState(null, "", next);
    }
    setPathname(next);
  }, []);

  const replace = useCallback((to) => navigate(to, { replace: true }), [navigate]);

  return { pathname, route, navigate, replace };
}
