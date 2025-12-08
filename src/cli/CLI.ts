/**
 * ============================================================================
 * VULPES CELARE CLI - Core Implementation
 * ============================================================================
 *
 * Beautiful, production-grade CLI implementation with:
 * - Rich colored output
 * - Progress indicators
 * - Interactive mode
 * - Batch processing
 * - Multiple output formats
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import chalk from "chalk";
import ora, { Ora } from "ora";
import Table from "cli-table3";
import figures from "figures";
import boxen from "boxen";

import {
  VulpesCelare,
  VulpesCelareConfig,
  RedactionResult,
  PHIType,
  ReplacementStyle,
} from "../VulpesCelare";
import { PolicyTemplates, PolicyCompiler } from "../PolicyDSL";
import { VERSION, ENGINE_NAME, VARIANT } from "../index";

// ============================================================================
// THEME & STYLING
// ============================================================================

const theme = {
  // Brand colors
  primary: chalk.hex("#FF6B35"), // Fox orange
  secondary: chalk.hex("#4ECDC4"), // Teal accent
  accent: chalk.hex("#FFE66D"), // Gold highlight

  // Semantic colors
  success: chalk.hex("#2ECC71"),
  warning: chalk.hex("#F39C12"),
  error: chalk.hex("#E74C3C"),
  info: chalk.hex("#3498DB"),
  muted: chalk.hex("#95A5A6"),

  // Text styles
  bold: chalk.bold,
  dim: chalk.dim,
  italic: chalk.italic,
  underline: chalk.underline,

  // PHI type colors
  phi: {
    name: chalk.hex("#E74C3C"),
    ssn: chalk.hex("#9B59B6"),
    phone: chalk.hex("#3498DB"),
    email: chalk.hex("#1ABC9C"),
    address: chalk.hex("#E67E22"),
    date: chalk.hex("#F1C40F"),
    mrn: chalk.hex("#E91E63"),
    default: chalk.hex("#95A5A6"),
  },
};

// ============================================================================
// CLI CLASS
// ============================================================================

export class CLI {
  private static spinner: Ora | null = null;

  // ══════════════════════════════════════════════════════════════════════════
  // BANNER & BRANDING
  // ══════════════════════════════════════════════════════════════════════════

  static getBanner(): string {
    const fox = `
    ${theme.primary("    /\\___/\\")}
    ${theme.primary("   (  o o  )")}  ${theme.bold.white(ENGINE_NAME)}
    ${theme.primary("   (  =^=  )")}  ${theme.muted(VARIANT)}
    ${theme.primary("    )     (")}   ${theme.secondary(`v${VERSION}`)}
    ${theme.primary("   (       )")}
    ${theme.primary("  ( |     | )")}  ${theme.dim("HIPAA PHI Redaction Engine")}
    ${theme.primary(" (__|     |__)")} ${theme.dim("99.6% Sensitivity | 2-3ms Processing")}
`;
    return fox;
  }

  static printBanner(): void {
    console.log(this.getBanner());
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OUTPUT HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  static log(message: string): void {
    console.log(message);
  }

  static success(message: string): void {
    console.log(`${theme.success(figures.tick)} ${message}`);
  }

  static error(message: string): void {
    console.error(`${theme.error(figures.cross)} ${theme.error(message)}`);
  }

  static warn(message: string): void {
    console.log(`${theme.warning(figures.warning)} ${theme.warning(message)}`);
  }

  static infoMsg(message: string): void {
    console.log(`${theme.info(figures.info)} ${message}`);
  }

  static divider(): void {
    console.log(theme.muted("─".repeat(60)));
  }

  static newline(): void {
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPINNER / PROGRESS
  // ══════════════════════════════════════════════════════════════════════════

  static startSpinner(text: string): void {
    this.spinner = ora({
      text,
      spinner: "dots12",
      color: "yellow",
    }).start();
  }

  static updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  static succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  static failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  static stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROGRESS BAR
  // ══════════════════════════════════════════════════════════════════════════

  static progressBar(
    current: number,
    total: number,
    width: number = 40,
  ): string {
    const percent = Math.min(100, Math.floor((current / total) * 100));
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const bar =
      theme.primary("█".repeat(filled)) + theme.muted("░".repeat(empty));
    const percentStr = `${percent}%`.padStart(4);
    const countStr = theme.muted(`(${current}/${total})`);

    return `${bar} ${theme.bold(percentStr)} ${countStr}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIG PARSING
  // ══════════════════════════════════════════════════════════════════════════

  private static parseConfig(options: any): VulpesCelareConfig {
    const config: VulpesCelareConfig = {};

    if (options.style) {
      config.replacementStyle = options.style as ReplacementStyle;
    }

    if (options.enable) {
      config.enabledTypes = options.enable
        .split(",")
        .map((t: string) => t.trim()) as PHIType[];
    }

    if (options.disable) {
      config.disabledTypes = options.disable
        .split(",")
        .map((t: string) => t.trim()) as PHIType[];
    }

    return config;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REDACT COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async redact(file: string | undefined, options: any): Promise<void> {
    const quiet = options.quiet;

    if (!quiet) {
      this.printBanner();
    }

    let input: string;

    // Read input
    if (file) {
      if (!fs.existsSync(file)) {
        this.error(`File not found: ${file}`);
        process.exit(1);
      }
      if (!quiet) this.startSpinner(`Reading ${path.basename(file)}...`);
      input = fs.readFileSync(file, "utf-8");
      if (!quiet)
        this.succeedSpinner(`Read ${input.length.toLocaleString()} characters`);
    } else {
      // Read from stdin
      if (!quiet)
        this.infoMsg("Reading from stdin (press Ctrl+D when done)...");
      input = await this.readStdin();
    }

    // Process
    if (!quiet) this.startSpinner("Redacting PHI...");

    const config = this.parseConfig(options);
    const vulpes = new VulpesCelare(config);
    const result = await vulpes.process(input);

    if (!quiet) {
      this.succeedSpinner(
        `Redacted ${theme.bold(result.redactionCount.toString())} PHI instances in ${theme.secondary(result.executionTimeMs + "ms")}`,
      );
    }

    // Output based on format
    const output = this.formatOutput(
      result,
      input,
      options.format,
      options.showSpans,
    );

    if (options.output) {
      fs.writeFileSync(options.output, output);
      if (!quiet) this.success(`Output written to ${options.output}`);
    } else {
      if (!quiet) {
        this.newline();
        this.divider();
        this.log(theme.bold("REDACTED OUTPUT:"));
        this.divider();
      }
      console.log(output);
    }

    // Show breakdown if not quiet
    if (!quiet && result.redactionCount > 0) {
      this.newline();
      this.printBreakdown(result);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BATCH COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async batch(directory: string, options: any): Promise<void> {
    const quiet = options.quiet;

    if (!quiet) {
      this.printBanner();
    }

    if (!fs.existsSync(directory)) {
      this.error(`Directory not found: ${directory}`);
      process.exit(1);
    }

    const stats = fs.statSync(directory);
    if (!stats.isDirectory()) {
      this.error(`Not a directory: ${directory}`);
      process.exit(1);
    }

    // Find files
    const extensions = options.ext
      .split(",")
      .map((e: string) => e.trim().toLowerCase());
    const maxDepth = parseInt(options.maxDepth) || 10;
    const files = this.findFiles(directory, extensions, maxDepth);

    if (files.length === 0) {
      this.warn(`No files found matching extensions: ${extensions.join(", ")}`);
      return;
    }

    if (!quiet) {
      this.infoMsg(
        `Found ${theme.bold(files.length.toString())} files to process`,
      );
      this.newline();
    }

    // Setup output directory
    const outputDir = options.output || `${directory}_redacted`;

    if (options.dryRun) {
      this.infoMsg(theme.warning("DRY RUN - No files will be modified"));
      this.newline();
      for (const file of files) {
        const relativePath = path.relative(directory, file);
        const outputPath = path.join(outputDir, relativePath);
        this.log(`  ${theme.muted(figures.arrowRight)} ${relativePath}`);
        this.log(`    ${theme.muted("→")} ${outputPath}`);
      }
      return;
    }

    // Process files
    const config = this.parseConfig(options);
    const vulpes = new VulpesCelare(config);
    const threads = Math.min(parseInt(options.threads) || 4, files.length);

    const results: { file: string; result: RedactionResult; error?: string }[] =
      [];
    let processed = 0;
    let totalRedactions = 0;
    let totalTime = 0;

    // Process in batches
    for (let i = 0; i < files.length; i += threads) {
      const batch = files.slice(i, i + threads);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const input = fs.readFileSync(file, "utf-8");
            const result = await vulpes.process(input);

            // Write output
            const relativePath = path.relative(directory, file);
            const outputPath = path.join(outputDir, relativePath);
            const outputDirPath = path.dirname(outputPath);

            if (!fs.existsSync(outputDirPath)) {
              fs.mkdirSync(outputDirPath, { recursive: true });
            }

            fs.writeFileSync(outputPath, result.text);

            return { file, result };
          } catch (err: any) {
            return { file, result: null as any, error: err.message };
          }
        }),
      );

      for (const r of batchResults) {
        results.push(r);
        processed++;

        if (r.result) {
          totalRedactions += r.result.redactionCount;
          totalTime += r.result.executionTimeMs;
        }

        if (!quiet) {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(
            `  ${this.progressBar(processed, files.length)} `,
          );

          const status = r.error
            ? theme.error(figures.cross)
            : theme.success(figures.tick);
          const relativePath = path.relative(directory, r.file);
          process.stdout.write(`${status} ${theme.muted(relativePath)}`);
        }
      }
    }

    if (!quiet) {
      this.newline();
      this.newline();
    }

    // Summary
    const errors = results.filter((r) => r.error);
    const successful = results.filter((r) => !r.error);

    if (!quiet || options.summary) {
      this.divider();
      this.log(theme.bold("BATCH PROCESSING COMPLETE"));
      this.divider();
      this.newline();

      const summaryTable = new Table({
        chars: this.getTableChars(),
        style: { head: [], border: [] },
      });

      summaryTable.push(
        [
          theme.muted("Files Processed"),
          theme.bold(successful.length.toString()),
        ],
        [
          theme.muted("Files Failed"),
          errors.length > 0
            ? theme.error(errors.length.toString())
            : theme.success("0"),
        ],
        [
          theme.muted("Total PHI Redacted"),
          theme.primary(totalRedactions.toLocaleString()),
        ],
        [
          theme.muted("Total Time"),
          theme.secondary(`${totalTime.toLocaleString()}ms`),
        ],
        [
          theme.muted("Avg Time/File"),
          theme.secondary(`${(totalTime / successful.length).toFixed(2)}ms`),
        ],
        [theme.muted("Output Directory"), outputDir],
      );

      console.log(summaryTable.toString());

      if (errors.length > 0) {
        this.newline();
        this.warn("Errors encountered:");
        for (const e of errors) {
          this.log(`  ${theme.error(figures.cross)} ${e.file}: ${e.error}`);
        }
      }
    }

    this.newline();
    this.success(
      `Batch processing complete! Output saved to ${theme.underline(outputDir)}`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERACTIVE COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async interactive(options: any): Promise<void> {
    this.printBanner();

    const config = this.parseConfig(options);
    const vulpes = new VulpesCelare(config);

    console.log(
      boxen(
        `${theme.bold("Interactive Mode")}\n\n` +
          `${theme.muted("Enter text to redact. Commands:")}\n` +
          `  ${theme.secondary(".help")}    ${theme.muted("Show help")}\n` +
          `  ${theme.secondary(".stats")}   ${theme.muted("Show session statistics")}\n` +
          `  ${theme.secondary(".clear")}   ${theme.muted("Clear screen")}\n` +
          `  ${theme.secondary(".exit")}    ${theme.muted("Exit interactive mode")}\n` +
          `  ${theme.secondary(".file")}    ${theme.muted("Load and redact a file")}`,
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "cyan",
        },
      ),
    );

    this.newline();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const sessionStats = {
      documents: 0,
      totalRedactions: 0,
      totalTime: 0,
      totalChars: 0,
    };

    const prompt = () => {
      rl.question(
        theme.primary("vulpes") + theme.muted(" > "),
        async (input) => {
          input = input.trim();

          if (!input) {
            prompt();
            return;
          }

          // Handle commands
          if (input.startsWith(".")) {
            const [cmd, ...args] = input.slice(1).split(" ");

            switch (cmd.toLowerCase()) {
              case "exit":
              case "quit":
              case "q":
                this.newline();
                this.infoMsg("Goodbye! Stay HIPAA compliant.");
                rl.close();
                process.exit(0);
                break;

              case "help":
              case "h":
              case "?":
                this.printInteractiveHelp();
                break;

              case "stats":
                this.printSessionStats(sessionStats);
                break;

              case "clear":
              case "cls":
                console.clear();
                this.printBanner();
                break;

              case "file":
                if (args.length === 0) {
                  this.error("Usage: .file <path>");
                } else {
                  const filePath = args.join(" ");
                  if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, "utf-8");
                    const result = await vulpes.process(content);
                    sessionStats.documents++;
                    sessionStats.totalRedactions += result.redactionCount;
                    sessionStats.totalTime += result.executionTimeMs;
                    sessionStats.totalChars += content.length;

                    this.newline();
                    this.divider();
                    console.log(result.text);
                    this.divider();
                    this.printBreakdown(result);
                  } else {
                    this.error(`File not found: ${filePath}`);
                  }
                }
                break;

              default:
                this.warn(`Unknown command: .${cmd}`);
            }

            prompt();
            return;
          }

          // Process text
          const result = await vulpes.process(input);
          sessionStats.documents++;
          sessionStats.totalRedactions += result.redactionCount;
          sessionStats.totalTime += result.executionTimeMs;
          sessionStats.totalChars += input.length;

          this.newline();

          if (result.redactionCount > 0) {
            // Highlight redactions in output
            console.log(this.highlightRedactions(result.text));
            this.newline();
            this.success(
              `${result.redactionCount} PHI redacted in ${result.executionTimeMs}ms`,
            );
          } else {
            console.log(theme.success(result.text));
            this.newline();
            this.infoMsg(`No PHI detected (${result.executionTimeMs}ms)`);
          }

          this.newline();
          prompt();
        },
      );
    };

    prompt();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYZE COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async analyze(file: string, options: any): Promise<void> {
    const quiet = options.quiet;

    if (!quiet) {
      this.printBanner();
    }

    if (!fs.existsSync(file)) {
      this.error(`File not found: ${file}`);
      process.exit(1);
    }

    this.startSpinner("Analyzing document...");

    const input = fs.readFileSync(file, "utf-8");
    const vulpes = new VulpesCelare();
    const result = await vulpes.process(input);

    this.succeedSpinner("Analysis complete");
    this.newline();

    if (options.format === "json") {
      const analysis = {
        file,
        characters: input.length,
        phiCount: result.redactionCount,
        executionTimeMs: result.executionTimeMs,
        breakdown: result.breakdown,
      };
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    if (options.format === "csv") {
      console.log("type,count");
      for (const [type, count] of Object.entries(result.breakdown)) {
        console.log(`${type},${count}`);
      }
      return;
    }

    // Table format (default)
    this.divider();
    this.log(theme.bold(`ANALYSIS: ${path.basename(file)}`));
    this.divider();
    this.newline();

    const summaryTable = new Table({
      chars: this.getTableChars(),
      style: { head: [], border: [] },
    });

    summaryTable.push(
      [theme.muted("File"), path.basename(file)],
      [theme.muted("Size"), `${input.length.toLocaleString()} characters`],
      [
        theme.muted("PHI Instances"),
        result.redactionCount > 0
          ? theme.warning(result.redactionCount.toString())
          : theme.success("0"),
      ],
      [theme.muted("Analysis Time"), `${result.executionTimeMs}ms`],
    );

    console.log(summaryTable.toString());
    this.newline();

    if (result.redactionCount > 0) {
      this.log(theme.bold("PHI BREAKDOWN BY TYPE:"));
      this.newline();

      const phiTable = new Table({
        head: [theme.bold("Type"), theme.bold("Count")],
        chars: this.getTableChars(),
        style: { head: [], border: [] },
      });

      const sortedBreakdown = Object.entries(result.breakdown).sort(
        ([, a], [, b]) => b - a,
      );

      for (const [type, count] of sortedBreakdown) {
        const typeColor = this.getPhiColor(type);
        phiTable.push([typeColor(type), theme.bold(count.toString())]);
      }

      console.log(phiTable.toString());
    } else {
      console.log(
        boxen(
          theme.success(`${figures.tick} No PHI detected in this document`),
          {
            padding: 1,
            borderStyle: "round",
            borderColor: "green",
            title: "CLEAN",
            titleAlignment: "center",
          },
        ),
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POLICY COMMANDS
  // ══════════════════════════════════════════════════════════════════════════

  static async policyList(): Promise<void> {
    this.printBanner();

    this.log(theme.bold("AVAILABLE POLICY TEMPLATES:"));
    this.newline();

    const templates = Object.entries(PolicyTemplates);

    const table = new Table({
      head: [theme.bold("Template"), theme.bold("Description")],
      chars: this.getTableChars(),
      style: { head: [], border: [] },
      colWidths: [20, 55],
      wordWrap: true,
    });

    const descriptions: Record<string, string> = {
      HIPAA_STRICT:
        "Full HIPAA Safe Harbor compliance. All 18 identifier types redacted.",
      RESEARCH:
        "Relaxed for research. Preserves dates, ages under 90, partial zips.",
      TRAINING: "Maximum de-identification for ML training datasets.",
      CLINICAL_REVIEW: "Balanced for clinical review. Preserves context.",
      OCR_TOLERANT: "Enhanced fuzzy matching for OCR-scanned documents.",
    };

    for (const [name] of templates) {
      table.push([
        theme.primary(name),
        theme.muted(descriptions[name] || "Custom policy template"),
      ]);
    }

    console.log(table.toString());
    this.newline();
    this.infoMsg(
      `Use ${theme.secondary("vulpes policy show <name>")} for details`,
    );
  }

  static async policyShow(name: string): Promise<void> {
    this.printBanner();

    const template = (PolicyTemplates as any)[name.toUpperCase()];

    if (!template) {
      this.error(`Unknown policy template: ${name}`);
      this.infoMsg(`Available: ${Object.keys(PolicyTemplates).join(", ")}`);
      process.exit(1);
    }

    this.log(theme.bold(`POLICY: ${name.toUpperCase()}`));
    this.divider();
    this.newline();

    console.log(JSON.stringify(template, null, 2));
  }

  static async policyCompile(file: string, options: any): Promise<void> {
    this.printBanner();

    if (!fs.existsSync(file)) {
      this.error(`File not found: ${file}`);
      process.exit(1);
    }

    this.startSpinner("Compiling policy...");

    try {
      const dsl = fs.readFileSync(file, "utf-8");
      const compiled = PolicyCompiler.compile(dsl);

      this.succeedSpinner("Policy compiled successfully");

      const output = options.output || file.replace(/\.dsl$/, ".json");
      fs.writeFileSync(output, JSON.stringify(compiled, null, 2));

      this.success(`Compiled policy written to ${output}`);
    } catch (err: any) {
      this.failSpinner("Compilation failed");
      this.error(err.message);
      process.exit(1);
    }
  }

  static async policyValidate(file: string): Promise<void> {
    this.printBanner();

    if (!fs.existsSync(file)) {
      this.error(`File not found: ${file}`);
      process.exit(1);
    }

    this.startSpinner("Validating policy...");

    try {
      const content = fs.readFileSync(file, "utf-8");

      if (file.endsWith(".dsl")) {
        PolicyCompiler.compile(content);
      } else {
        JSON.parse(content);
      }

      this.succeedSpinner("Policy is valid");
      this.success(`${file} passed validation`);
    } catch (err: any) {
      this.failSpinner("Validation failed");
      this.error(err.message);
      process.exit(1);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INFO COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async info(options: any): Promise<void> {
    const infoData = {
      engine: ENGINE_NAME,
      variant: VARIANT,
      version: VERSION,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      filters: new VulpesCelare().getActiveFilters().length,
      phiTypes: VulpesCelare.ALL_PHI_TYPES.length,
    };

    if (options.json) {
      console.log(JSON.stringify(infoData, null, 2));
      return;
    }

    this.printBanner();

    const table = new Table({
      chars: this.getTableChars(),
      style: { head: [], border: [] },
    });

    table.push(
      [theme.muted("Engine"), theme.bold(infoData.engine)],
      [theme.muted("Variant"), infoData.variant],
      [theme.muted("Version"), theme.secondary(infoData.version)],
      [theme.muted("Node.js"), infoData.nodeVersion],
      [theme.muted("Platform"), `${infoData.platform} (${infoData.arch})`],
      [theme.muted("Active Filters"), infoData.filters.toString()],
      [theme.muted("PHI Types"), infoData.phiTypes.toString()],
    );

    console.log(table.toString());
    this.newline();

    console.log(
      boxen(
        `${theme.muted("Documentation:")} ${theme.underline("https://github.com/DocHatty/Vulpes-Celare")}\n` +
          `${theme.muted("License:")} AGPL-3.0-only`,
        { padding: 1, borderStyle: "round", borderColor: "gray" },
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FILTERS COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async filters(options: any): Promise<void> {
    const vulpes = new VulpesCelare();
    const activeFilters = vulpes.getActiveFilters();

    if (options.format === "json") {
      console.log(
        JSON.stringify(
          {
            count: activeFilters.length,
            filters: activeFilters,
            phiTypes: VulpesCelare.ALL_PHI_TYPES,
          },
          null,
          2,
        ),
      );
      return;
    }

    this.printBanner();

    this.log(theme.bold("AVAILABLE PHI FILTERS:"));
    this.newline();

    // Group filters by category
    const categories: Record<string, string[]> = {
      Identity: [
        "SmartNameFilterSpan",
        "FormattedNameFilterSpan",
        "TitledNameFilterSpan",
        "FamilyNameFilterSpan",
      ],
      "Government IDs": [
        "SSNFilterSpan",
        "PassportNumberFilterSpan",
        "LicenseNumberFilterSpan",
        "DEAFilterSpan",
      ],
      Contact: [
        "PhoneFilterSpan",
        "FaxNumberFilterSpan",
        "EmailFilterSpan",
        "AddressFilterSpan",
        "ZipCodeFilterSpan",
      ],
      Medical: [
        "MRNFilterSpan",
        "NPIFilterSpan",
        "HealthPlanNumberFilterSpan",
        "AgeFilterSpan",
        "DateFilterSpan",
      ],
      Financial: ["CreditCardFilterSpan", "AccountNumberFilterSpan"],
      Technical: [
        "IPAddressFilterSpan",
        "URLFilterSpan",
        "DeviceIdentifierFilterSpan",
        "VehicleIdentifierFilterSpan",
        "BiometricContextFilterSpan",
        "UniqueIdentifierFilterSpan",
      ],
    };

    for (const [category, filters] of Object.entries(categories)) {
      this.log(theme.primary(`  ${category}`));
      for (const filter of filters) {
        const isActive = activeFilters.includes(filter);
        const icon = isActive
          ? theme.success(figures.tick)
          : theme.muted(figures.cross);
        const name = filter
          .replace("FilterSpan", "")
          .replace(/([A-Z])/g, " $1")
          .trim();
        this.log(`    ${icon} ${isActive ? name : theme.muted(name)}`);
      }
      this.newline();
    }

    this.infoMsg(
      `${theme.bold(activeFilters.length.toString())} filters active`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BENCHMARK COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async benchmark(options: any): Promise<void> {
    const quiet = options.quiet;

    if (!quiet) {
      this.printBanner();
      this.log(theme.bold("PERFORMANCE BENCHMARK"));
      this.divider();
      this.newline();
    }

    const iterations = parseInt(options.iterations) || 100;

    // Sample documents by size
    const samples: Record<string, string> = {
      small:
        "Patient John Smith (SSN: 123-45-6789) was seen on 01/15/2024. Contact: 555-123-4567.",
      medium: `
        MEDICAL RECORD
        Patient: Margaret Elizabeth Thompson-Williams
        DOB: 03/15/1965 | MRN: MRN-2024-789456
        SSN: 234-56-7890 | Phone: (555) 234-5678
        Address: 1234 Oak Street, Apt 5B, Springfield, IL 62701

        CHIEF COMPLAINT: Patient presents with recurring headaches.

        HISTORY: The patient was previously seen by Dr. Robert Johnson (NPI: 1234567890)
        at Springfield General Hospital. Email correspondence: mthompson@email.com

        Insurance: BlueCross BlueShield, Policy #: BCBS-2024-123456
        Credit Card on file: 4111-1111-1111-1111
      `.trim(),
      large: Array(10)
        .fill(
          `
        DISCHARGE SUMMARY
        Patient: James Wilson
        DOB: 01/15/1980
        MRN: MRN-12345678
        SSN: 123-45-6789
        Phone: (555) 123-4567
        Email: patient@hospital.org
        Address: 1234 Medical Center Drive, Suite 100, Healthcare City, CA 90210

        The patient was admitted on 01/15/2024 with complaints of chest pain.
        Attending physician: Dr. Smith (NPI: 1234567890)

        DIAGNOSIS: Acute myocardial infarction, NSTEMI
        PROCEDURES: Cardiac catheterization, stent placement
        MEDICATIONS: Aspirin 81mg, Metoprolol 25mg, Lisinopril 10mg

        FOLLOW-UP: Patient to return in 2 weeks. IP Address logged: 192.168.1.100
      `,
        )
        .join("\n\n"),
    };

    const testDoc = samples[options.size] || samples.medium;
    const vulpes = new VulpesCelare();

    if (!quiet) {
      this.infoMsg(
        `Document size: ${theme.bold(testDoc.length.toLocaleString())} characters`,
      );
      this.infoMsg(`Iterations: ${theme.bold(iterations.toString())}`);
      this.newline();
      this.startSpinner(`Running ${iterations} iterations...`);
    }

    const times: number[] = [];
    let totalRedactions = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = await vulpes.process(testDoc);
      const elapsed = performance.now() - start;
      times.push(elapsed);
      totalRedactions = result.redactionCount;

      if (!quiet && i % 10 === 0) {
        this.updateSpinner(`Running iteration ${i + 1}/${iterations}...`);
      }
    }

    if (!quiet) {
      this.succeedSpinner("Benchmark complete");
      this.newline();
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = times[0];
    const max = times[times.length - 1];
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    const resultsTable = new Table({
      chars: this.getTableChars(),
      style: { head: [], border: [] },
    });

    resultsTable.push(
      [
        theme.muted("Document Size"),
        `${testDoc.length.toLocaleString()} chars`,
      ],
      [theme.muted("PHI Redacted"), totalRedactions.toString()],
      [theme.muted("Iterations"), iterations.toString()],
      [theme.muted(""), ""],
      [theme.bold("Min"), theme.success(`${min.toFixed(2)}ms`)],
      [theme.bold("Max"), theme.warning(`${max.toFixed(2)}ms`)],
      [theme.bold("Average"), theme.primary(`${avg.toFixed(2)}ms`)],
      [theme.bold("P50 (Median)"), `${p50.toFixed(2)}ms`],
      [theme.bold("P95"), `${p95.toFixed(2)}ms`],
      [theme.bold("P99"), `${p99.toFixed(2)}ms`],
      [theme.muted(""), ""],
      [
        theme.bold("Throughput"),
        theme.secondary(`${(1000 / avg).toFixed(0)} docs/sec`),
      ],
      [
        theme.bold("Chars/sec"),
        theme.secondary(`${((testDoc.length * 1000) / avg).toLocaleString()}`),
      ],
    );

    console.log(resultsTable.toString());

    if (!quiet) {
      this.newline();

      // Visual performance indicator
      const perfRating =
        avg < 3
          ? "EXCELLENT"
          : avg < 10
            ? "GOOD"
            : avg < 50
              ? "ACCEPTABLE"
              : "SLOW";
      const perfColor =
        avg < 3 ? "green" : avg < 10 ? "cyan" : avg < 50 ? "yellow" : "red";

      console.log(
        boxen(
          `Performance Rating: ${perfRating}\n` +
            `${theme.muted("Target: < 3ms per document")}`,
          { padding: 1, borderStyle: "round", borderColor: perfColor },
        ),
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STREAM COMMAND
  // ══════════════════════════════════════════════════════════════════════════

  static async stream(options: any): Promise<void> {
    this.printBanner();

    this.infoMsg("Streaming mode active. Type text and press Enter.");
    this.infoMsg(`Mode: ${theme.secondary(options.mode)}`);
    this.infoMsg("Press Ctrl+C to exit.");
    this.newline();

    const config = this.parseConfig(options);
    const vulpes = new VulpesCelare(config);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", async (line) => {
      const result = await vulpes.process(line);
      console.log(theme.primary("→ ") + result.text);
    });

    rl.on("close", () => {
      this.newline();
      this.infoMsg("Stream closed.");
      process.exit(0);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ══════════════════════════════════════════════════════════════════════════

  private static async readStdin(): Promise<string> {
    return new Promise((resolve) => {
      // PERFORMANCE FIX: Use array of chunks instead of string concatenation
      // String concatenation is O(n²), Buffer.concat/join is O(n)
      const chunks: string[] = [];
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (chunk: string) => {
        chunks.push(chunk);
      });
      process.stdin.on("end", () => {
        resolve(chunks.join(""));
      });
    });
  }

  private static findFiles(
    dir: string,
    extensions: string[],
    maxDepth: number,
    currentDepth: number = 0,
  ): string[] {
    if (currentDepth > maxDepth) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(
          ...this.findFiles(fullPath, extensions, maxDepth, currentDepth + 1),
        );
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private static formatOutput(
    result: RedactionResult,
    _original: string,
    format: string,
    _showSpans?: boolean,
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(
          {
            redactedText: result.text,
            redactionCount: result.redactionCount,
            executionTimeMs: result.executionTimeMs,
            breakdown: result.breakdown,
          },
          null,
          2,
        );

      case "csv":
        const rows = ["redacted_text"];
        rows.push(`"${result.text.replace(/"/g, '""')}"`);
        return rows.join("\n");

      case "report":
        let report = `VULPES CELARE REDACTION REPORT\n`;
        report += `${"=".repeat(50)}\n\n`;
        report += `Redactions: ${result.redactionCount}\n`;
        report += `Execution Time: ${result.executionTimeMs}ms\n\n`;
        report += `BREAKDOWN:\n`;
        for (const [type, count] of Object.entries(result.breakdown)) {
          report += `  ${type}: ${count}\n`;
        }
        report += `\nREDACTED TEXT:\n${"-".repeat(50)}\n`;
        report += result.text;
        return report;

      default:
        return result.text;
    }
  }

  private static printBreakdown(result: RedactionResult): void {
    if (Object.keys(result.breakdown).length === 0) return;

    this.log(theme.bold("PHI BREAKDOWN:"));
    this.newline();

    const table = new Table({
      head: [theme.bold("Type"), theme.bold("Count")],
      chars: this.getTableChars(),
      style: { head: [], border: [] },
    });

    const sortedBreakdown = Object.entries(result.breakdown).sort(
      ([, a], [, b]) => b - a,
    );

    for (const [type, count] of sortedBreakdown) {
      const typeColor = this.getPhiColor(type);
      table.push([typeColor(type), count.toString()]);
    }

    console.log(table.toString());
  }

  private static printInteractiveHelp(): void {
    this.newline();
    console.log(
      boxen(
        `${theme.bold("Interactive Commands")}\n\n` +
          `${theme.secondary(".help, .h, .?")}   Show this help\n` +
          `${theme.secondary(".stats")}         Show session statistics\n` +
          `${theme.secondary(".clear, .cls")}   Clear the screen\n` +
          `${theme.secondary(".file <path>")}   Load and redact a file\n` +
          `${theme.secondary(".exit, .quit")}   Exit interactive mode\n\n` +
          `${theme.muted("Or just type text to redact it immediately.")}`,
        { padding: 1, borderStyle: "round", borderColor: "cyan" },
      ),
    );
    this.newline();
  }

  private static printSessionStats(stats: {
    documents: number;
    totalRedactions: number;
    totalTime: number;
    totalChars: number;
  }): void {
    this.newline();

    const table = new Table({
      chars: this.getTableChars(),
      style: { head: [], border: [] },
    });

    table.push(
      [theme.muted("Documents Processed"), stats.documents.toString()],
      [
        theme.muted("Total PHI Redacted"),
        theme.primary(stats.totalRedactions.toString()),
      ],
      [theme.muted("Total Characters"), stats.totalChars.toLocaleString()],
      [theme.muted("Total Time"), `${stats.totalTime}ms`],
      [
        theme.muted("Avg Time/Doc"),
        stats.documents > 0
          ? `${(stats.totalTime / stats.documents).toFixed(2)}ms`
          : "N/A",
      ],
    );

    console.log(table.toString());
    this.newline();
  }

  private static highlightRedactions(text: string): string {
    // Highlight bracketed redactions
    return text.replace(/\[([A-Z-]+)\]/g, (match) => theme.warning(match));
  }

  private static getPhiColor(type: string): typeof chalk {
    const colorMap: Record<string, typeof chalk> = {
      SmartNameFilter: theme.phi.name,
      FormattedNameFilter: theme.phi.name,
      TitledNameFilter: theme.phi.name,
      FamilyNameFilter: theme.phi.name,
      SSNFilter: theme.phi.ssn,
      PhoneFilter: theme.phi.phone,
      EmailFilter: theme.phi.email,
      AddressFilter: theme.phi.address,
      DateFilter: theme.phi.date,
      MRNFilter: theme.phi.mrn,
    };

    for (const [key, color] of Object.entries(colorMap)) {
      if (type.includes(key.replace("Filter", ""))) return color;
    }

    return theme.phi.default;
  }

  private static getTableChars() {
    return {
      top: "─",
      "top-mid": "┬",
      "top-left": "┌",
      "top-right": "┐",
      bottom: "─",
      "bottom-mid": "┴",
      "bottom-left": "└",
      "bottom-right": "┘",
      left: "│",
      "left-mid": "├",
      mid: "─",
      "mid-mid": "┼",
      right: "│",
      "right-mid": "┤",
      middle: "│",
    };
  }
}
