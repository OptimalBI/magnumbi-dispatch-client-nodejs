/**
 * The client for the MagnumBI Dispatch framework.
 */
export declare class DispatchClient {
    private readonly _hostname;
    private readonly _port;
    private _sslOptions;
    private readonly _secretKey;
    private readonly _accessKey;
    private static readonly _jobTimeoutModifier;
    /**
     * Creates a new Dispatch Client
     *
     * @param {string} hostname The hostname of the Dispatch server (example: https://127.0.0.1)
     * @param {number} port The port of the Dispatch server (default 6883)
     * @param {string} accessKey The access key for authentication
     * @param {string} secretKey The secret key for authentication
     * @param {SslOptions} sslOptions Optional ssl options
     */
    constructor(hostname: string, port: number, accessKey: string, secretKey: string, sslOptions?: SslOptions);
    /**
     * Checks the status of the MagnumBI Dispatch Server
     * Returns True if connected to server successfully.
     * @returns {Promise<boolean>}
     * @constructor
     */
    StatusCheck(): Promise<boolean>;
    /**
     * Removes all pending jobs from the specified queue.
     *
     * @param {string} queueId
     * @returns {Promise<boolean>}
     * @constructor
     */
    ClearQueue(queueId: string): Promise<void>;
    CompleteSpecificJob(job: DispatchJob): Promise<void>;
    CompleteJob(queueId: string, jobId: string): Promise<void>;
    /**
     * Submit a new job on the specified application queue.
     *
     * @param {string} queueId The queueId.
     * @param data The job's data.
     * @param previousJobs Any jobs that caused this job.
     * @returns {Promise<void>}
     * @constructor
     */
    SubmitJob(queueId: string, data: any, previousJobs?: string[]): Promise<void>;
    /**
     * Returns a job if there is one waiting, else null
     *
     * @param {string} queueId The of the queue we want jobs from.
     * @param {number} jobTimeoutSeconds The number of seconds before assuming a job fails.
     * @param {number} longPollingSeconds The max number of seconds before returning with no job.
     * @returns {Promise<DispatchJob>} The magnum microservice job or null.
     * @constructor
     */
    RequestJob(queueId: string, jobTimeoutSeconds?: number, longPollingSeconds?: number): Promise<DispatchJob>;
}
export declare class DispatchJob {
    jobId: string;
    queueId: string;
    data: any;
    private dispatchClient;
    constructor(jobId: string, queueId: string, data: any, dispatchClient: DispatchClient);
    Complete(): Promise<void>;
}
export declare class SslOptions {
    private _useSsl;
    private _verifySsl;
    verifySsl: boolean;
    private _sslCert;
    sslCert: string;
}
