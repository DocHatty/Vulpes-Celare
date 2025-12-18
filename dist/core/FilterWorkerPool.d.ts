import { Span } from "../models/Span";
export declare class FilterWorkerPool {
    private static instance;
    private workers;
    private queue;
    private pending;
    private workerStatus;
    private workerTasks;
    private maxWorkers;
    private initialized;
    private constructor();
    private ensureInitialized;
    static getInstance(): FilterWorkerPool;
    private initializeWorkers;
    private addWorker;
    private handleWorkerDeath;
    private handleWorkerResponse;
    private processNext;
    private runTask;
    execute(filterName: string, text: string, config: any): Promise<Span[]>;
    private runSync;
    /**
     * Terminate all workers
     */
    terminate(): Promise<void>;
}
//# sourceMappingURL=FilterWorkerPool.d.ts.map