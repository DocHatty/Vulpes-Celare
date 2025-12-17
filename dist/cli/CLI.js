"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const ora_1 = __importDefault(require("ora"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const figures_1 = __importDefault(require("figures"));
const VulpesCelare_1 = require("../VulpesCelare");
const PolicyDSL_1 = require("../PolicyDSL");
const meta_1 = require("../meta");
// ============================================================================
// UNIFIED THEME SYSTEM
// ============================================================================
const theme_1 = require("../theme");
const output_1 = require("../theme/output");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// ============================================================================
// CLI CLASS
// ============================================================================
class CLI {
    static spinner = null;
    // ══════════════════════════════════════════════════════════════════════════
    // BANNER & BRANDING
    // ══════════════════════════════════════════════════════════════════════════
    static getBanner() {
        // Use themed banner with fox art
        return output_1.Banner.standard({ version: meta_1.VERSION, showArt: true, artSize: "compact" });
    }
    static printBanner() {
        VulpesOutput_1.out.print(this.getBanner());
    }
    // ══════════════════════════════════════════════════════════════════════════
    // OUTPUT HELPERS (using unified output components)
    // ══════════════════════════════════════════════════════════════════════════
    static log(message) {
        VulpesOutput_1.out.print(message);
    }
    static success(message) {
        VulpesOutput_1.out.print(output_1.Status.success(message));
    }
    static error(message) {
        VulpesOutput_1.out.print(output_1.Status.error(message));
    }
    static warn(message) {
        VulpesOutput_1.out.print(output_1.Status.warning(message));
    }
    static infoMsg(message) {
        VulpesOutput_1.out.print(output_1.Status.info(message));
    }
    static divider() {
        VulpesOutput_1.out.print(output_1.Divider.line({ width: 60 }));
    }
    static newline() {
        VulpesOutput_1.out.blank();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SPINNER / PROGRESS
    // ══════════════════════════════════════════════════════════════════════════
    static startSpinner(text) {
        this.spinner = (0, ora_1.default)({
            text,
            spinner: "dots12",
            color: "yellow",
        }).start();
    }
    static updateSpinner(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }
    static succeedSpinner(text) {
        if (this.spinner) {
            this.spinner.succeed(text);
            this.spinner = null;
        }
    }
    static failSpinner(text) {
        if (this.spinner) {
            this.spinner.fail(text);
            this.spinner = null;
        }
    }
    static stopSpinner() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // PROGRESS BAR (using unified output components)
    // ══════════════════════════════════════════════════════════════════════════
    static progressBar(current, total, width = 40) {
        return output_1.Progress.bar(current / total, {
            width,
            showPercent: true,
            showValue: true,
            total,
        });
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CONFIG PARSING
    // ══════════════════════════════════════════════════════════════════════════
    static parseConfig(options) {
        const config = {};
        if (options.style) {
            config.replacementStyle = options.style;
        }
        if (options.enable) {
            config.enabledTypes = options.enable
                .split(",")
                .map((t) => t.trim());
        }
        if (options.disable) {
            config.disabledTypes = options.disable
                .split(",")
                .map((t) => t.trim());
        }
        return config;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // REDACT COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async redact(file, options) {
        const quiet = options.quiet;
        if (!quiet) {
            this.printBanner();
        }
        let input;
        // Read input
        if (file) {
            if (!fs.existsSync(file)) {
                this.error(`File not found: ${file}`);
                process.exit(1);
            }
            if (!quiet)
                this.startSpinner(`Reading ${path.basename(file)}...`);
            input = fs.readFileSync(file, "utf-8");
            if (!quiet)
                this.succeedSpinner(`Read ${input.length.toLocaleString()} characters`);
        }
        else {
            // Read from stdin
            if (!quiet)
                this.infoMsg("Reading from stdin (press Ctrl+D when done)...");
            input = await this.readStdin();
        }
        // Process
        if (!quiet)
            this.startSpinner("Redacting PHI...");
        const config = this.parseConfig(options);
        const vulpes = new VulpesCelare_1.VulpesCelare(config);
        const result = await vulpes.process(input);
        if (!quiet) {
            this.succeedSpinner(`Redacted ${theme_1.theme.bold(result.redactionCount.toString())} PHI instances in ${theme_1.theme.secondary(result.executionTimeMs + "ms")}`);
        }
        // Output based on format
        const output = this.formatOutput(result, input, options.format, options.showSpans);
        if (options.output) {
            fs.writeFileSync(options.output, output);
            if (!quiet)
                this.success(`Output written to ${options.output}`);
        }
        else {
            if (!quiet) {
                this.newline();
                this.divider();
                this.log(theme_1.theme.bold("REDACTED OUTPUT:"));
                this.divider();
            }
            VulpesOutput_1.out.print(output);
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
    static async batch(directory, options) {
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
            .map((e) => e.trim().toLowerCase());
        const maxDepth = parseInt(options.maxDepth) || 10;
        const files = this.findFiles(directory, extensions, maxDepth);
        if (files.length === 0) {
            this.warn(`No files found matching extensions: ${extensions.join(", ")}`);
            return;
        }
        if (!quiet) {
            this.infoMsg(`Found ${theme_1.theme.bold(files.length.toString())} files to process`);
            this.newline();
        }
        // Setup output directory
        const outputDir = options.output || `${directory}_redacted`;
        if (options.dryRun) {
            this.infoMsg(theme_1.theme.warning("DRY RUN - No files will be modified"));
            this.newline();
            for (const file of files) {
                const relativePath = path.relative(directory, file);
                const outputPath = path.join(outputDir, relativePath);
                this.log(`  ${theme_1.theme.muted(figures_1.default.arrowRight)} ${relativePath}`);
                this.log(`    ${theme_1.theme.muted("→")} ${outputPath}`);
            }
            return;
        }
        // Process files
        const config = this.parseConfig(options);
        const vulpes = new VulpesCelare_1.VulpesCelare(config);
        const threads = Math.min(parseInt(options.threads) || 4, files.length);
        const results = [];
        let processed = 0;
        let totalRedactions = 0;
        let totalTime = 0;
        // Process in batches
        for (let i = 0; i < files.length; i += threads) {
            const batch = files.slice(i, i + threads);
            const batchResults = await Promise.all(batch.map(async (file) => {
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
                }
                catch (err) {
                    return { file, result: null, error: err.message };
                }
            }));
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
                    process.stdout.write(`  ${this.progressBar(processed, files.length)} `);
                    const status = r.error
                        ? theme_1.theme.error(figures_1.default.cross)
                        : theme_1.theme.success(figures_1.default.tick);
                    const relativePath = path.relative(directory, r.file);
                    process.stdout.write(`${status} ${theme_1.theme.muted(relativePath)}`);
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
            this.log(theme_1.theme.bold("BATCH PROCESSING COMPLETE"));
            this.divider();
            this.newline();
            const summaryTable = new cli_table3_1.default({
                chars: this.getTableChars(),
                style: { head: [], border: [] },
            });
            summaryTable.push([
                theme_1.theme.muted("Files Processed"),
                theme_1.theme.bold(successful.length.toString()),
            ], [
                theme_1.theme.muted("Files Failed"),
                errors.length > 0
                    ? theme_1.theme.error(errors.length.toString())
                    : theme_1.theme.success("0"),
            ], [
                theme_1.theme.muted("Total PHI Redacted"),
                theme_1.theme.primary(totalRedactions.toLocaleString()),
            ], [
                theme_1.theme.muted("Total Time"),
                theme_1.theme.secondary(`${totalTime.toLocaleString()}ms`),
            ], [
                theme_1.theme.muted("Avg Time/File"),
                theme_1.theme.secondary(`${(totalTime / successful.length).toFixed(2)}ms`),
            ], [theme_1.theme.muted("Output Directory"), outputDir]);
            VulpesOutput_1.out.print(summaryTable.toString());
            if (errors.length > 0) {
                this.newline();
                this.warn("Errors encountered:");
                for (const e of errors) {
                    this.log(`  ${theme_1.theme.error(figures_1.default.cross)} ${e.file}: ${e.error}`);
                }
            }
        }
        this.newline();
        this.success(`Batch processing complete! Output saved to ${theme_1.theme.underline(outputDir)}`);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INTERACTIVE COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async interactive(options) {
        this.printBanner();
        const config = this.parseConfig(options);
        const vulpes = new VulpesCelare_1.VulpesCelare(config);
        VulpesOutput_1.out.print(output_1.Box.info([
            theme_1.theme.bold("Interactive Mode"),
            "",
            theme_1.theme.muted("Enter text to redact. Commands:"),
            `  ${theme_1.theme.secondary(".help")}    ${theme_1.theme.muted("Show help")}`,
            `  ${theme_1.theme.secondary(".stats")}   ${theme_1.theme.muted("Show session statistics")}`,
            `  ${theme_1.theme.secondary(".clear")}   ${theme_1.theme.muted("Clear screen")}`,
            `  ${theme_1.theme.secondary(".exit")}    ${theme_1.theme.muted("Exit interactive mode")}`,
            `  ${theme_1.theme.secondary(".file")}    ${theme_1.theme.muted("Load and redact a file")}`,
        ], { title: "Interactive Mode" }));
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
            rl.question(theme_1.theme.primary("vulpes") + theme_1.theme.muted(" > "), async (input) => {
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
                            }
                            else {
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
                                    VulpesOutput_1.out.print(result.text);
                                    this.divider();
                                    this.printBreakdown(result);
                                }
                                else {
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
                    VulpesOutput_1.out.print(this.highlightRedactions(result.text));
                    this.newline();
                    this.success(`${result.redactionCount} PHI redacted in ${result.executionTimeMs}ms`);
                }
                else {
                    VulpesOutput_1.out.print(theme_1.theme.success(result.text));
                    this.newline();
                    this.infoMsg(`No PHI detected (${result.executionTimeMs}ms)`);
                }
                this.newline();
                prompt();
            });
        };
        prompt();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // ANALYZE COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async analyze(file, options) {
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
        const vulpes = new VulpesCelare_1.VulpesCelare();
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
            VulpesOutput_1.out.print(JSON.stringify(analysis, null, 2));
            return;
        }
        if (options.format === "csv") {
            VulpesOutput_1.out.print("type,count");
            for (const [type, count] of Object.entries(result.breakdown)) {
                VulpesOutput_1.out.print(`${type},${count}`);
            }
            return;
        }
        // Table format (default)
        this.divider();
        this.log(theme_1.theme.bold(`ANALYSIS: ${path.basename(file)}`));
        this.divider();
        this.newline();
        const summaryTable = new cli_table3_1.default({
            chars: this.getTableChars(),
            style: { head: [], border: [] },
        });
        summaryTable.push([theme_1.theme.muted("File"), path.basename(file)], [theme_1.theme.muted("Size"), `${input.length.toLocaleString()} characters`], [
            theme_1.theme.muted("PHI Instances"),
            result.redactionCount > 0
                ? theme_1.theme.warning(result.redactionCount.toString())
                : theme_1.theme.success("0"),
        ], [theme_1.theme.muted("Analysis Time"), `${result.executionTimeMs}ms`]);
        VulpesOutput_1.out.print(summaryTable.toString());
        this.newline();
        if (result.redactionCount > 0) {
            this.log(theme_1.theme.bold("PHI BREAKDOWN BY TYPE:"));
            this.newline();
            const phiTable = new cli_table3_1.default({
                head: [theme_1.theme.bold("Type"), theme_1.theme.bold("Count")],
                chars: this.getTableChars(),
                style: { head: [], border: [] },
            });
            const sortedBreakdown = Object.entries(result.breakdown).sort(([, a], [, b]) => b - a);
            for (const [type, count] of sortedBreakdown) {
                const typeColor = this.getPhiColor(type);
                phiTable.push([typeColor(type), theme_1.theme.bold(count.toString())]);
            }
            VulpesOutput_1.out.print(phiTable.toString());
        }
        else {
            VulpesOutput_1.out.print(output_1.Box.success("No PHI detected in this document", { title: "CLEAN" }));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // POLICY COMMANDS
    // ══════════════════════════════════════════════════════════════════════════
    static async policyList() {
        this.printBanner();
        this.log(theme_1.theme.bold("AVAILABLE POLICY TEMPLATES:"));
        this.newline();
        const templates = Object.entries(PolicyDSL_1.PolicyTemplates);
        const table = new cli_table3_1.default({
            head: [theme_1.theme.bold("Template"), theme_1.theme.bold("Description")],
            chars: this.getTableChars(),
            style: { head: [], border: [] },
            colWidths: [20, 55],
            wordWrap: true,
        });
        const descriptions = {
            HIPAA_STRICT: "Full HIPAA Safe Harbor compliance. All 18 identifier types redacted.",
            RESEARCH: "Relaxed for research. Preserves dates, ages under 90, partial zips.",
            TRAINING: "Maximum de-identification for ML training datasets.",
            CLINICAL_REVIEW: "Balanced for clinical review. Preserves context.",
            OCR_TOLERANT: "Enhanced fuzzy matching for OCR-scanned documents.",
        };
        for (const [name] of templates) {
            table.push([
                theme_1.theme.primary(name),
                theme_1.theme.muted(descriptions[name] || "Custom policy template"),
            ]);
        }
        VulpesOutput_1.out.print(table.toString());
        this.newline();
        this.infoMsg(`Use ${theme_1.theme.secondary("vulpes policy show <name>")} for details`);
    }
    static async policyShow(name) {
        this.printBanner();
        const template = PolicyDSL_1.PolicyTemplates[name.toUpperCase()];
        if (!template) {
            this.error(`Unknown policy template: ${name}`);
            this.infoMsg(`Available: ${Object.keys(PolicyDSL_1.PolicyTemplates).join(", ")}`);
            process.exit(1);
        }
        this.log(theme_1.theme.bold(`POLICY: ${name.toUpperCase()}`));
        this.divider();
        this.newline();
        VulpesOutput_1.out.print(JSON.stringify(template, null, 2));
    }
    static async policyCompile(file, options) {
        this.printBanner();
        if (!fs.existsSync(file)) {
            this.error(`File not found: ${file}`);
            process.exit(1);
        }
        this.startSpinner("Compiling policy...");
        try {
            const dsl = fs.readFileSync(file, "utf-8");
            const compiled = PolicyDSL_1.PolicyCompiler.compile(dsl);
            this.succeedSpinner("Policy compiled successfully");
            const output = options.output || file.replace(/\.dsl$/, ".json");
            fs.writeFileSync(output, JSON.stringify(compiled, null, 2));
            this.success(`Compiled policy written to ${output}`);
        }
        catch (err) {
            this.failSpinner("Compilation failed");
            this.error(err.message);
            process.exit(1);
        }
    }
    static async policyValidate(file) {
        this.printBanner();
        if (!fs.existsSync(file)) {
            this.error(`File not found: ${file}`);
            process.exit(1);
        }
        this.startSpinner("Validating policy...");
        try {
            const content = fs.readFileSync(file, "utf-8");
            if (file.endsWith(".dsl")) {
                PolicyDSL_1.PolicyCompiler.compile(content);
            }
            else {
                JSON.parse(content);
            }
            this.succeedSpinner("Policy is valid");
            this.success(`${file} passed validation`);
        }
        catch (err) {
            this.failSpinner("Validation failed");
            this.error(err.message);
            process.exit(1);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INFO COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async info(options) {
        const infoData = {
            engine: meta_1.ENGINE_NAME,
            variant: meta_1.VARIANT,
            version: meta_1.VERSION,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            filters: new VulpesCelare_1.VulpesCelare().getActiveFilters().length,
            phiTypes: VulpesCelare_1.VulpesCelare.ALL_PHI_TYPES.length,
        };
        if (options.json) {
            VulpesOutput_1.out.print(JSON.stringify(infoData, null, 2));
            return;
        }
        this.printBanner();
        const table = new cli_table3_1.default({
            chars: this.getTableChars(),
            style: { head: [], border: [] },
        });
        table.push([theme_1.theme.muted("Engine"), theme_1.theme.bold(infoData.engine)], [theme_1.theme.muted("Variant"), infoData.variant], [theme_1.theme.muted("Version"), theme_1.theme.secondary(infoData.version)], [theme_1.theme.muted("Node.js"), infoData.nodeVersion], [theme_1.theme.muted("Platform"), `${infoData.platform} (${infoData.arch})`], [theme_1.theme.muted("Active Filters"), infoData.filters.toString()], [theme_1.theme.muted("PHI Types"), infoData.phiTypes.toString()]);
        VulpesOutput_1.out.print(table.toString());
        this.newline();
        VulpesOutput_1.out.print(output_1.Box.create([
            `${theme_1.theme.muted("Documentation:")} ${theme_1.theme.underline("https://github.com/DocHatty/Vulpes-Celare")}`,
            `${theme_1.theme.muted("License:")} Evaluation Only`,
        ], { style: "rounded" }));
    }
    // ══════════════════════════════════════════════════════════════════════════
    // FILTERS COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async filters(options) {
        const vulpes = new VulpesCelare_1.VulpesCelare();
        const activeFilters = vulpes.getActiveFilters();
        if (options.format === "json") {
            VulpesOutput_1.out.print(JSON.stringify({
                count: activeFilters.length,
                filters: activeFilters,
                phiTypes: VulpesCelare_1.VulpesCelare.ALL_PHI_TYPES,
            }, null, 2));
            return;
        }
        this.printBanner();
        this.log(theme_1.theme.bold("AVAILABLE PHI FILTERS:"));
        this.newline();
        // Group filters by category
        const categories = {
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
            ],
        };
        for (const [category, filters] of Object.entries(categories)) {
            this.log(theme_1.theme.primary(`  ${category}`));
            for (const filter of filters) {
                const isActive = activeFilters.includes(filter);
                const icon = isActive
                    ? theme_1.theme.success(figures_1.default.tick)
                    : theme_1.theme.muted(figures_1.default.cross);
                const name = filter
                    .replace("FilterSpan", "")
                    .replace(/([A-Z])/g, " $1")
                    .trim();
                this.log(`    ${icon} ${isActive ? name : theme_1.theme.muted(name)}`);
            }
            this.newline();
        }
        this.infoMsg(`${theme_1.theme.bold(activeFilters.length.toString())} filters active`);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // BENCHMARK COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async benchmark(options) {
        const quiet = options.quiet;
        if (!quiet) {
            this.printBanner();
            this.log(theme_1.theme.bold("PERFORMANCE BENCHMARK"));
            this.divider();
            this.newline();
        }
        const iterations = parseInt(options.iterations) || 100;
        // Sample documents by size
        const samples = {
            small: "Patient John Smith (SSN: 123-45-6789) was seen on 01/15/2024. Contact: 555-123-4567.",
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
                .fill(`
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
      `)
                .join("\n\n"),
        };
        const testDoc = samples[options.size] || samples.medium;
        const vulpes = new VulpesCelare_1.VulpesCelare();
        if (!quiet) {
            this.infoMsg(`Document size: ${theme_1.theme.bold(testDoc.length.toLocaleString())} characters`);
            this.infoMsg(`Iterations: ${theme_1.theme.bold(iterations.toString())}`);
            this.newline();
            this.startSpinner(`Running ${iterations} iterations...`);
        }
        const times = [];
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
        const resultsTable = new cli_table3_1.default({
            chars: this.getTableChars(),
            style: { head: [], border: [] },
        });
        resultsTable.push([
            theme_1.theme.muted("Document Size"),
            `${testDoc.length.toLocaleString()} chars`,
        ], [theme_1.theme.muted("PHI Redacted"), totalRedactions.toString()], [theme_1.theme.muted("Iterations"), iterations.toString()], [theme_1.theme.muted(""), ""], [theme_1.theme.bold("Min"), theme_1.theme.success(`${min.toFixed(2)}ms`)], [theme_1.theme.bold("Max"), theme_1.theme.warning(`${max.toFixed(2)}ms`)], [theme_1.theme.bold("Average"), theme_1.theme.primary(`${avg.toFixed(2)}ms`)], [theme_1.theme.bold("P50 (Median)"), `${p50.toFixed(2)}ms`], [theme_1.theme.bold("P95"), `${p95.toFixed(2)}ms`], [theme_1.theme.bold("P99"), `${p99.toFixed(2)}ms`], [theme_1.theme.muted(""), ""], [
            theme_1.theme.bold("Throughput"),
            theme_1.theme.secondary(`${(1000 / avg).toFixed(0)} docs/sec`),
        ], [
            theme_1.theme.bold("Chars/sec"),
            theme_1.theme.secondary(`${((testDoc.length * 1000) / avg).toLocaleString()}`),
        ]);
        VulpesOutput_1.out.print(resultsTable.toString());
        if (!quiet) {
            this.newline();
            // Visual performance indicator
            const perfRating = avg < 3
                ? "EXCELLENT"
                : avg < 10
                    ? "GOOD"
                    : avg < 50
                        ? "ACCEPTABLE"
                        : "SLOW";
            const perfColor = avg < 3 ? "green" : avg < 10 ? "cyan" : avg < 50 ? "yellow" : "red";
            const perfBox = avg < 3
                ? output_1.Box.success([`Performance Rating: ${perfRating}`, theme_1.theme.muted("Target: < 3ms per document")])
                : avg < 10
                    ? output_1.Box.info([`Performance Rating: ${perfRating}`, theme_1.theme.muted("Target: < 3ms per document")])
                    : avg < 50
                        ? output_1.Box.warning([`Performance Rating: ${perfRating}`, theme_1.theme.muted("Target: < 3ms per document")])
                        : output_1.Box.error([`Performance Rating: ${perfRating}`, theme_1.theme.muted("Target: < 3ms per document")]);
            VulpesOutput_1.out.print(perfBox);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // STREAM COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async stream(options) {
        this.printBanner();
        this.infoMsg("Streaming mode active. Type text and press Enter.");
        this.infoMsg(`Mode: ${theme_1.theme.secondary(options.mode)}`);
        this.infoMsg("Press Ctrl+C to exit.");
        this.newline();
        const config = this.parseConfig(options);
        const vulpes = new VulpesCelare_1.VulpesCelare(config);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.on("line", async (line) => {
            const result = await vulpes.process(line);
            VulpesOutput_1.out.print(theme_1.theme.primary("→ ") + result.text);
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
    static async readStdin() {
        return new Promise((resolve) => {
            // PERFORMANCE FIX: Use array of chunks instead of string concatenation
            // String concatenation is O(n²), Buffer.concat/join is O(n)
            const chunks = [];
            process.stdin.setEncoding("utf-8");
            process.stdin.on("data", (chunk) => {
                chunks.push(chunk);
            });
            process.stdin.on("end", () => {
                resolve(chunks.join(""));
            });
        });
    }
    static findFiles(dir, extensions, maxDepth, currentDepth = 0) {
        if (currentDepth > maxDepth)
            return [];
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.findFiles(fullPath, extensions, maxDepth, currentDepth + 1));
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
        return files;
    }
    static formatOutput(result, _original, format, _showSpans) {
        switch (format) {
            case "json":
                return JSON.stringify({
                    redactedText: result.text,
                    redactionCount: result.redactionCount,
                    executionTimeMs: result.executionTimeMs,
                    breakdown: result.breakdown,
                }, null, 2);
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
    static printBreakdown(result) {
        if (Object.keys(result.breakdown).length === 0)
            return;
        this.log(theme_1.theme.bold("PHI BREAKDOWN:"));
        this.newline();
        const table = new cli_table3_1.default({
            head: [theme_1.theme.bold("Type"), theme_1.theme.bold("Count")],
            chars: this.getTableChars(),
            style: { head: [], border: [] },
        });
        const sortedBreakdown = Object.entries(result.breakdown).sort(([, a], [, b]) => b - a);
        for (const [type, count] of sortedBreakdown) {
            const typeColor = this.getPhiColor(type);
            table.push([typeColor(type), count.toString()]);
        }
        VulpesOutput_1.out.print(table.toString());
    }
    static printInteractiveHelp() {
        this.newline();
        VulpesOutput_1.out.print(output_1.Box.info([
            theme_1.theme.bold("Interactive Commands"),
            "",
            `${theme_1.theme.secondary(".help, .h, .?")}   Show this help`,
            `${theme_1.theme.secondary(".stats")}         Show session statistics`,
            `${theme_1.theme.secondary(".clear, .cls")}   Clear the screen`,
            `${theme_1.theme.secondary(".file <path>")}   Load and redact a file`,
            `${theme_1.theme.secondary(".exit, .quit")}   Exit interactive mode`,
            "",
            theme_1.theme.muted("Or just type text to redact it immediately."),
        ]));
        this.newline();
    }
    static printSessionStats(stats) {
        this.newline();
        const table = new cli_table3_1.default({
            chars: this.getTableChars(),
            style: { head: [], border: [] },
        });
        table.push([theme_1.theme.muted("Documents Processed"), stats.documents.toString()], [
            theme_1.theme.muted("Total PHI Redacted"),
            theme_1.theme.primary(stats.totalRedactions.toString()),
        ], [theme_1.theme.muted("Total Characters"), stats.totalChars.toLocaleString()], [theme_1.theme.muted("Total Time"), `${stats.totalTime}ms`], [
            theme_1.theme.muted("Avg Time/Doc"),
            stats.documents > 0
                ? `${(stats.totalTime / stats.documents).toFixed(2)}ms`
                : "N/A",
        ]);
        VulpesOutput_1.out.print(table.toString());
        this.newline();
    }
    static highlightRedactions(text) {
        // Highlight bracketed redactions
        return text.replace(/\[([A-Z-]+)\]/g, (match) => theme_1.theme.warning(match));
    }
    static getPhiColor(type) {
        const colorMap = {
            SmartNameFilter: theme_1.theme.phi.name,
            FormattedNameFilter: theme_1.theme.phi.name,
            TitledNameFilter: theme_1.theme.phi.name,
            FamilyNameFilter: theme_1.theme.phi.name,
            SSNFilter: theme_1.theme.phi.ssn,
            PhoneFilter: theme_1.theme.phi.phone,
            EmailFilter: theme_1.theme.phi.email,
            AddressFilter: theme_1.theme.phi.address,
            DateFilter: theme_1.theme.phi.date,
            MRNFilter: theme_1.theme.phi.mrn,
        };
        for (const [key, color] of Object.entries(colorMap)) {
            if (type.includes(key.replace("Filter", "")))
                return color;
        }
        return theme_1.theme.phi.default;
    }
    static getTableChars() {
        // Use unified theme table characters
        return (0, theme_1.getTableChars)("sharp");
    }
    // ══════════════════════════════════════════════════════════════════════════
    // DEEP ANALYSIS COMMAND
    // ══════════════════════════════════════════════════════════════════════════
    static async deepAnalyze(options) {
        if (!options.json) {
            this.printBanner();
            VulpesOutput_1.out.print(theme_1.theme.bold("\n  DEEP ANALYSIS ENGINE\n"));
            VulpesOutput_1.out.print(theme_1.theme.muted("  Opus 4.5 Extended Thinking + Codex 5.2 High Max\n"));
        }
        try {
            // Dynamic require of the deep analysis engine (JS module)
            // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
            const { DeepAnalysisEngine } = require("../../tests/master-suite/cortex/analysis/deep-analysis-engine.js");
            const engine = new DeepAnalysisEngine({
                selfCorrection: { enabled: options.selfCorrect !== false },
                checkpoints: { enabled: options.checkpoints !== false },
            });
            // Check threshold first
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const threshold = await engine.checkThreshold();
            if (!options.json) {
                VulpesOutput_1.out.print(theme_1.theme.info(`  Documents analyzed: ${threshold.documentCount}`));
                VulpesOutput_1.out.print(theme_1.theme.info(`  Confidence level: ${threshold.confidenceLevel?.confidence}`));
                VulpesOutput_1.out.print(theme_1.theme.info(`  CI width: ${threshold.confidenceLevel?.ciWidth}\n`));
            }
            if (!threshold.meetsMinimum && !options.force) {
                if (options.json) {
                    VulpesOutput_1.out.print(JSON.stringify({
                        success: false,
                        error: "THRESHOLD_NOT_MET",
                        ...threshold,
                    }, null, 2));
                }
                else {
                    this.warn(threshold.recommendedAction?.message);
                    VulpesOutput_1.out.print(theme_1.theme.muted(`\n  Run: ${threshold.recommendedAction?.command}\n`));
                    VulpesOutput_1.out.print(theme_1.theme.muted("  Or use --force to run analysis anyway\n"));
                }
                return;
            }
            // Run deep analysis
            this.startSpinner("Running deep analysis...");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const analysis = await engine.runDeepAnalysis({
                force: options.force,
                enhanced: options.enhanced,
                production: options.production,
            });
            this.succeedSpinner("Deep analysis complete");
            if (options.json) {
                VulpesOutput_1.out.print(JSON.stringify(analysis, null, 2));
            }
            else {
                // Print report
                VulpesOutput_1.out.print(engine.generateReport(analysis));
                // Show top recommendations
                const recs = analysis.phases?.deepResearch?.recommendations || [];
                if (recs.length > 0) {
                    VulpesOutput_1.out.print(theme_1.theme.bold("\n  TOP RECOMMENDATIONS:\n"));
                    for (let i = 0; i < Math.min(3, recs.length); i++) {
                        const rec = recs[i];
                        VulpesOutput_1.out.print(theme_1.theme.warning(`  ${i + 1}. [${rec.priority}] ${rec.action}`));
                        VulpesOutput_1.out.print(theme_1.theme.muted(`     Files: ${(rec.files || []).join(", ")}`));
                        VulpesOutput_1.out.print(theme_1.theme.muted(`     Expected: ${rec.expectedImprovement || "Unknown"}\n`));
                    }
                }
                // Show next steps
                VulpesOutput_1.out.print(theme_1.theme.bold("\n  NEXT STEPS:\n"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  1. Review the recommendations above"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  2. Apply fixes one at a time"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  3. Run: npm test -- --log-file"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  4. Compare metrics before/after\n"));
            }
        }
        catch (error) {
            this.failSpinner("Deep analysis failed");
            if (options.json) {
                VulpesOutput_1.out.print(JSON.stringify({
                    success: false,
                    error: error.message,
                }, null, 2));
            }
            else {
                this.error(error.message);
            }
            process.exit(1);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // TEST COMMAND WITH SELF-CORRECTION
    // ══════════════════════════════════════════════════════════════════════════
    static async runTests(options) {
        this.printBanner();
        VulpesOutput_1.out.print(theme_1.theme.bold("\n  PHI DETECTION TEST SUITE\n"));
        // Determine document count
        let count = parseInt(options.count || "200");
        if (options.quick)
            count = 50;
        if (options.thorough)
            count = 500;
        const profile = options.profile || "HIPAA_STRICT";
        VulpesOutput_1.out.print(theme_1.theme.info(`  Documents: ${count}`));
        VulpesOutput_1.out.print(theme_1.theme.info(`  Profile: ${profile}`));
        VulpesOutput_1.out.print(theme_1.theme.info(`  Self-correction: ${options.selfCorrect ? "enabled" : "disabled"}`));
        VulpesOutput_1.out.print(theme_1.theme.info(`  Checkpoints: ${options.checkpoints ? "enabled" : "disabled"}\n`));
        try {
            if (options.selfCorrect) {
                // Use self-correction orchestrator
                // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
                const { SelfCorrectionOrchestrator } = require("../../tests/master-suite/cortex/analysis/self-correction-orchestrator.js");
                const orchestrator = new SelfCorrectionOrchestrator();
                this.startSpinner("Running tests with self-correction...");
                const result = await orchestrator.runWithSelfCorrection(async () => {
                    // Run the actual test suite
                    const { execSync } = await Promise.resolve().then(() => __importStar(require("child_process")));
                    const args = [
                        `--count=${count}`,
                        `--profile=${profile}`,
                        options.logFile ? "--log-file" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");
                    execSync(`node tests/master-suite/run.js ${args}`, {
                        cwd: process.cwd(),
                        stdio: "inherit",
                    });
                    return { success: true };
                });
                this.stopSpinner();
                VulpesOutput_1.out.print(orchestrator.generateReport());
                if (!result.success) {
                    VulpesOutput_1.out.print(theme_1.theme.error(`\n  Tests failed after ${result.attempts} attempts\n`));
                    process.exit(1);
                }
            }
            else {
                // Run tests directly
                const { execSync } = await Promise.resolve().then(() => __importStar(require("child_process")));
                const args = [
                    `--count=${count}`,
                    `--profile=${profile}`,
                    options.logFile ? "--log-file" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                execSync(`node tests/master-suite/run.js ${args}`, {
                    cwd: process.cwd(),
                    stdio: "inherit",
                });
            }
        }
        catch (error) {
            this.stopSpinner();
            this.error(error.message);
            process.exit(1);
        }
    }
}
exports.CLI = CLI;
//# sourceMappingURL=CLI.js.map