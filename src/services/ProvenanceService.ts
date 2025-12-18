/**
 * ProvenanceService
 *
 * Records redaction provenance to the local RPL layer (when available).
 * Extracted from `RedactionEngine` to keep orchestration concerns separate.
 */

import { ENGINE_NAME, VERSION } from "../meta";

export type ProvenanceRecordOptions = {
  /** Override the default endpoint (default: http://localhost:3106/provenance/record) */
  endpoint?: string;
  /** Optional document identifier; default is a generated ad-hoc ID */
  docId?: string;
  /** Optional actor identifier; default is "system-redaction-engine" */
  actorId?: string;
  /** Engine/version string to include in the manifest */
  engine?: string;
};

export class ProvenanceService {
  private static readonly DEFAULT_ENDPOINT =
    "http://localhost:3106/provenance/record";

  static async recordRedaction(
    original: string,
    redacted: string,
    options: ProvenanceRecordOptions = {},
  ): Promise<void> {
    // Only attempt if we are in an environment with fetch (Node 18+)
    if (typeof fetch === "undefined") return;

    const manifest = {
      timestamp: new Date().toISOString(),
      engine: options.engine ?? `${ENGINE_NAME} v${VERSION}`,
    };

    const payload = {
      docId: options.docId ?? `doc-${Date.now()}`,
      original,
      redacted,
      manifest,
      actorId: options.actorId ?? "system-redaction-engine",
    };

    const endpoint = options.endpoint ?? ProvenanceService.DEFAULT_ENDPOINT;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`RPL Server responded with ${response.status}: ${err}`);
    }
  }
}
