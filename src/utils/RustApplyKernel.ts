import { loadNativeBinding } from "../native/binding";
import { RustAccelConfig } from "../config/RustAccelConfig";

export type RustReplacement = {
  characterStart: number;
  characterEnd: number;
  replacement: string;
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

function isEnabled(): boolean {
  return RustAccelConfig.isApplySpansEnabled();
}

export const RustApplyKernel = {
  isAvailable(): boolean {
    return typeof getBinding()?.applyReplacements === "function";
  },

  apply(text: string, replacements: RustReplacement[]): string | null {
    if (!isEnabled()) return null;
    const binding = getBinding();
    const apply = binding?.applyReplacements;
    if (typeof apply !== "function") return null;
    try {
      return apply(text, replacements);
    } catch {
      return null;
    }
  },

  applyUnsafe(text: string, replacements: RustReplacement[]): string | null {
    const binding = getBinding();
    const apply = binding?.applyReplacements;
    if (typeof apply !== "function") return null;
    try {
      return apply(text, replacements);
    } catch {
      return null;
    }
  },
};
