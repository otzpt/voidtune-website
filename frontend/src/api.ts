import type {
  Architecture,
  HostInfo,
  LatencyData,
  OptimizationGroup,
  PCComponent,
  SystemSnapshot,
  VoidtuneInfo,
} from './types';

// Dev proxies /api to the FastAPI backend (see vite.config.ts), so a relative
// path works in both dev and production without a base-URL switch.
const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
};

export const getComponents = () => request<PCComponent[]>('/api/components');
export const getArchitecture = () => request<Architecture>('/api/architecture');
export const getVoidtune = () => request<VoidtuneInfo>('/api/voidtune');
export const getOptimizations = () => request<OptimizationGroup[]>('/api/optimizations');
export const getHost = () => request<HostInfo>('/api/host');
export const getLatency = () => request<LatencyData>('/api/host/latency');
export const getSystem = () => request<SystemSnapshot>('/api/system');
