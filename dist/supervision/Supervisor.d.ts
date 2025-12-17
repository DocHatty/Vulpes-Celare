/**
 * Supervisor - Elixir/OTP-Style Process Supervision
 *
 * Implements fault-tolerant supervision patterns inspired by Erlang/OTP:
 * - one_for_one: Restart only the failed child
 * - one_for_all: Restart all children if one fails
 * - rest_for_one: Restart failed child and all children started after it
 *
 * SUPERVISION TREE EXAMPLE:
 *   RootSupervisor (one_for_one)
 *   ├── StreamSupervisor (one_for_one)
 *   │   ├── StreamWorker[0]
 *   │   └── StreamWorker[1]
 *   ├── FilterSupervisor (one_for_all)
 *   │   ├── FilterProcess[SSN]
 *   │   └── FilterProcess[PHONE]
 *   └── MetricsSupervisor (one_for_one)
 *       └── HealthMonitor
 *
 * RESTART STRATEGIES:
 * - permanent: Always restart (default for critical processes)
 * - temporary: Never restart (for one-shot tasks)
 * - transient: Restart only on abnormal exit
 *
 * @module redaction/supervision
 */
import { EventEmitter } from "events";
export type RestartStrategy = "one_for_one" | "one_for_all" | "rest_for_one";
export type RestartType = "permanent" | "temporary" | "transient";
export interface ChildSpec {
    id: string;
    start: () => ChildProcess | Promise<ChildProcess>;
    restart: RestartType;
    shutdown: number;
}
export interface SupervisorConfig {
    strategy: RestartStrategy;
    maxRestarts: number;
    maxSeconds: number;
    children: ChildSpec[];
}
export interface ChildProcess {
    id: string;
    run(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
export declare class Supervisor extends EventEmitter {
    private config;
    private children;
    private childOrder;
    private restartHistory;
    private running;
    private shuttingDown;
    constructor(config: SupervisorConfig);
    /**
     * Start the supervisor and all children
     */
    start(): Promise<void>;
    /**
     * Stop the supervisor and all children
     */
    stop(): Promise<void>;
    /**
     * Start a single child process
     */
    private startChild;
    /**
     * Stop a single child process
     */
    private stopChild;
    /**
     * Run a process with supervision (handle failures)
     */
    private runWithSupervision;
    /**
     * Handle child process exit
     */
    private handleChildExit;
    /**
     * Check if a child should be restarted based on its spec
     */
    private shouldRestart;
    /**
     * Check if restart limits have been exceeded
     */
    private checkRestartLimits;
    /**
     * Apply the configured restart strategy
     */
    private applyRestartStrategy;
    /**
     * Restart a single child
     */
    private restartChild;
    /**
     * Escalate failure to parent supervisor or terminate
     */
    private escalate;
    /**
     * Get supervisor statistics
     */
    getStats(): {
        running: boolean;
        childCount: number;
        activeChildren: number;
        totalRestarts: number;
        strategy: RestartStrategy;
    };
    /**
     * Get child process by ID
     */
    getChild(id: string): ChildProcess | null;
    /**
     * Get all child IDs
     */
    getChildIds(): string[];
}
//# sourceMappingURL=Supervisor.d.ts.map