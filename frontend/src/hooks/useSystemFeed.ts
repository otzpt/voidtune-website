import { useEffect, useState } from 'react';
import { getSystem } from '../api';
import type { SystemSnapshot } from '../types';

/**
 * Polls the simulated telemetry endpoint.
 *
 * Polling rather than a websocket on purpose: the data is simulated and
 * changes smoothly, so a socket would add a connection lifecycle to manage for
 * no gain. Stops polling when `enabled` is false so background scenes don't
 * keep firing requests.
 */
export function useSystemFeed(enabled: boolean, intervalMs = 1200) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = () => {
      getSystem()
        .then((data) => {
          if (!cancelled) setSnapshot(data);
        })
        .catch(() => {
          /* a dropped poll is not worth surfacing -- the next one recovers */
        });
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);

  return snapshot;
}
