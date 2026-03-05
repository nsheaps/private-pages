import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface RouteInfo {
  /** The full hash path, e.g. "/docs/guide" */
  path: string;
  /** Parsed segments, e.g. ["docs", "guide"] */
  segments: string[];
}

interface RouterContextValue {
  route: RouteInfo;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function parseHash(): RouteInfo {
  const raw = window.location.hash.slice(1) || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const segments = path.split('/').filter(Boolean);
  return { path, segments };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteInfo>(parseHash);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
