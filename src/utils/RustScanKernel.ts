import { loadNativeBinding } from "../native/binding";
import { RedactionContext } from "../context/RedactionContext";
import { RustAccelConfig } from "../config/RustAccelConfig";

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
  return RustAccelConfig.isScanKernelEnabled();
}

type CacheEntry = { text: string; byType: Map<string, RustKernelDetection[]> };
const CACHE_KEY = "RustScanKernel:cache";

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

    const existing = context.getMemo<CacheEntry>(CACHE_KEY);
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

    context.setMemo(CACHE_KEY, { text, byType });
    return byType.get(type) ?? [];
  },
};
