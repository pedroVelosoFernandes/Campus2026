import { useCallback, useEffect, useState } from 'react';

/** Contagem regressiva em segundos (reenvio do SMS). */
export function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback((seconds: number) => setRemaining(seconds), []);
  return { remaining, restart };
}

export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
