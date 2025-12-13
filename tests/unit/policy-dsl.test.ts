import { describe, it, expect } from "vitest";

import { PolicyCompiler, PolicyTemplates } from "../../src/PolicyDSL";

describe("PolicyDSL", () => {
  it("has HIPAA_STRICT template", () => {
    expect(PolicyTemplates.HIPAA_STRICT).toBeTruthy();
    expect(PolicyTemplates.HIPAA_STRICT).toContain("policy HIPAA_STRICT");
  });

  it("has RESEARCH_RELAXED template", () => {
    expect(PolicyTemplates.RESEARCH_RELAXED).toBeTruthy();
    expect(PolicyTemplates.RESEARCH_RELAXED).toContain("policy RESEARCH_RELAXED");
  });

  it("has RADIOLOGY_DEPT template", () => {
    expect(PolicyTemplates.RADIOLOGY_DEPT).toBeTruthy();
    expect(PolicyTemplates.RADIOLOGY_DEPT).toContain("policy RADIOLOGY_DEPT");
  });

  it("has TRAINING template", () => {
    expect(PolicyTemplates.TRAINING).toBeTruthy();
    expect(PolicyTemplates.TRAINING).toContain("policy TRAINING");
  });

  it("compiles HIPAA_STRICT template", () => {
    const policy = PolicyCompiler.compile(PolicyTemplates.HIPAA_STRICT);
    expect(policy).toBeTruthy();
    expect(policy.name).toBe("HIPAA_STRICT");
    expect(policy.filters).toBeTruthy();
    expect(Object.keys(policy.filters).length).toBeGreaterThan(0);
  });

  it("compiles RESEARCH_RELAXED template", () => {
    const policy = PolicyCompiler.compile(PolicyTemplates.RESEARCH_RELAXED);
    expect(policy.name).toBe("RESEARCH_RELAXED");
    expect(policy.description).toBeTruthy();
  });

  it("compiles simple custom policy", () => {
    const dsl = `
policy TEST_POLICY {
  description "Test policy"

  redact names
  redact ssn
  keep dates

  threshold 0.5
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.name).toBe("TEST_POLICY");
    expect(policy.description).toBe("Test policy");
    expect(policy.globalThreshold).toBe(0.5);

    expect(policy.filters.names).toBeTruthy();
    expect(policy.filters.names.enabled).toBe(true);

    expect(policy.filters.ssn).toBeTruthy();
    expect(policy.filters.ssn.enabled).toBe(true);

    expect(policy.filters.dates).toBeTruthy();
    expect(policy.filters.dates.enabled).toBe(false);
  });

  it("supports policy inheritance", () => {
    const dsl = `
policy CUSTOM extends HIPAA_STRICT {
  description "Custom policy based on HIPAA"

  keep dates
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.name).toBe("CUSTOM");
    expect(policy.description).toBeTruthy();
  });

  it("handles redact rules", () => {
    const dsl = `
policy REDACT_TEST {
  redact names
  redact phones
  redact emails
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.filters.names.enabled).toBe(true);
    expect(policy.filters.phones.enabled).toBe(true);
    expect(policy.filters.emails.enabled).toBe(true);
  });

  it("handles keep rules", () => {
    const dsl = `
policy KEEP_TEST {
  redact names
  keep dates
  keep ages
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.filters.names.enabled).toBe(true);
    expect(policy.filters.dates.enabled).toBe(false);
    expect(policy.filters.ages.enabled).toBe(false);
  });

  it("validates policy structure", () => {
    const dsl = `
policy VALID_POLICY {
  description "A valid policy"
  redact names
  threshold 0.4
}
`;

    const policy = PolicyCompiler.compile(dsl);
    const validation = PolicyCompiler.validate(policy);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it("detects invalid policy (no name)", () => {
    expect(() => PolicyCompiler.compile("{}")).toThrow(/policy declaration/i);
  });

  it("handles threshold setting", () => {
    const dsl = `
policy THRESHOLD_TEST {
  redact names
  threshold 0.7
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.globalThreshold).toBe(0.7);
  });

  it("normalizes identifiers (singular/plural)", () => {
    const dsl = `
policy NORMALIZE_TEST {
  redact name
  redact phones
  redact email
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.filters.names || policy.filters.name).toBeTruthy();
    expect(policy.filters.phones || policy.filters.phone).toBeTruthy();
    expect(policy.filters.emails || policy.filters.email).toBeTruthy();
  });

  it("converts policy to JSON", () => {
    const dsl = `
policy JSON_TEST {
  description "Test JSON export"
  redact names
  redact ssn
}
`;

    const policy = PolicyCompiler.compile(dsl);
    const json = PolicyCompiler.toJSON(policy);
    expect(json).toContain('"name"');
    expect(json).toContain('"filters"');

    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("JSON_TEST");
  });

  it("handles comments in DSL", () => {
    const dsl = `
// This is a comment
policy COMMENT_TEST {
  // Another comment
  description "Test policy with comments"
  redact names
  redact ssn
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.name).toBe("COMMENT_TEST");
  });

  it("handles multiple redact rules", () => {
    const dsl = `
policy MULTI_REDACT {
  redact names
  redact ssn
  redact phones
  redact emails
  redact addresses
  redact dates
  redact mrn
}
`;

    const policy = PolicyCompiler.compile(dsl);
    const enabledFilters = Object.values(policy.filters).filter(
      (f: any) => f && f.enabled,
    );
    expect(enabledFilters.length).toBeGreaterThanOrEqual(7);
  });

  it("handles mixed redact and keep rules", () => {
    const dsl = `
policy MIXED_RULES {
  redact names
  redact ssn
  keep dates
  redact phones
  keep ages
}
`;

    const policy = PolicyCompiler.compile(dsl);
    expect(policy.filters.names.enabled).toBe(true);
    expect(policy.filters.ssn.enabled).toBe(true);
    expect(policy.filters.dates.enabled).toBe(false);
    expect(policy.filters.phones.enabled).toBe(true);
    expect(policy.filters.ages.enabled).toBe(false);
  });
});
