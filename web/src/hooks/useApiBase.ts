import { useEffect, useState } from 'react';

// API base is resolved at runtime: VITE_API_BASE > healthy(4000) > healthy(4001)
export function useApiBase() {
  const [base, setBase] = useState<string>(
    ((import.meta as any).env?.VITE_API_BASE as string) || "http://localhost:4000"
  );
  useEffect(() => {
    if ((import.meta as any).env?.VITE_API_BASE) return; // respect explicit override
    const tryHealth = async (url: string) => {
      try {
        const r = await fetch(`${url}/api/health`);
        return r.ok;
      } catch {
        return false;
      }
    };
    (async () => {
      if (await tryHealth("http://localhost:4000")) return setBase("http://localhost:4000");
      if (await tryHealth("http://localhost:4001")) return setBase("http://localhost:4001");
      // keep default; user can set VITE_API_BASE
    })();
  }, []);
  return base;
}

