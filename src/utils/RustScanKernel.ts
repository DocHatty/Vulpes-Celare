import { loadNativeBinding } from "../native/binding";
import { RedactionContext } from "../context/RedactionContext";

export type RustKernelDetection = {
  filterType: string;
  characterStart: number;
  characterEnd: number;
  text: string;
  confidence: number;
  pattern: string;
};

let cachedBinding: ReturnType<typeof loadNativeBinding> | null | undefined =
  undefined;

function getBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedBinding !== undefined) return cachedBinding;
  try {
    cachedBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedBinding = null;
  }
  return cachedBinding;
}

function isKernelEnabled(): boolean {
  return process.env.VULPES_SCAN_ACCEL === "1";
}

type CacheEntry = { text: string; byType: Map<string, RustKernelDetection[]> };
const cache = new WeakMap<RedactionContext, CacheEntry>();

export const RustScanKernel = {
  isAvailable(): boolean {
    return typeof getBinding()?.scanAllIdentifiers === "function";
  },

  getDetections(
    context: RedactionContext,
    text: string,
    type: string,
  ): RustKernelDetection[] | null {
    if (!isKernelEnabled()) return null;
    const binding = getBinding();
    const scanAll = binding?.scanAllIdentifiers;
    if (typeof scanAll !== "function") return null;

    const existing = cache.get(context);
    if (existing && existing.text === text) {
      return existing.byType.get(type) ?? [];
    }

    let detections: RustKernelDetection[] = [];
    try {
      detections = scanAll(text) ?? [];
    } catch {
      detections = [];
    }

    const byType = new Map<string, RustKernelDetection[]>();
    for (const d of detections) {
      const list = byType.get(d.filterType) ?? [];
      list.push(d);
      byType.set(d.filterType, list);
    }

    cache.set(context, { text, byType });
    return byType.get(type) ?? [];
  },
};
