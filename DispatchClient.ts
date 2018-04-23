import * as rp from "request-promise-native";

/**
 * The client for the MagnumBI Dispatch framework.
 */
export class DispatchClient {
    private readonly _hostname: string;
    private readonly _port: number;
    private _sslOptions: SslOptions;
    private readonly _secretKey: string;
    private readonly _accessKey: string;
    private static readonly _jobTimeoutModifier: number = 12000;

    /**
     * Creates a new Dispatch Client
     *
     * @param {string} hostname The hostname of the Dispatch server (example: https://127.0.0.1)
     * @param {number} port The port of the Dispatch server (default 6883)
     * @param {string} accessKey The access key for authentication
     * @param {string} secretKey The secret key for authentication
     * @param {SslOptions} sslOptions Optional ssl options
     */
    constructor(hostname: string, port: number, accessKey: string, secretKey: string,
                sslOptions: SslOptions = null) {
        this._hostname = hostname;
        this._port = port;
        this._accessKey = accessKey;
        this._secretKey = secretKey;
        this._sslOptions = sslOptions;
    }

    /**
     * Checks the status of the MagnumBI Dispatch Server
     * Returns True if connected to server successfully.
     * @returns {Promise<boolean>}
     * @constructor
     */
    public async StatusCheck(): Promise<boolean> {
        let options = {
            uri: `${this._hostname}:${this._port}/job/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            'auth': {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            method: 'GET',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };
        try {
            let data = await rp(options);
            return data.status == "OK";
        } catch (error) {
            return Promise.reject(`Failed to check status ${error}`)
        }
    }

    /**
     * Removes all pending jobs from the specified queue.
     *
     * @param {string} queueId
     * @returns {Promise<boolean>}
     * @constructor
     */
    public async ClearQueue(queueId: string): Promise<void> {
        let options = {
            uri: `${this._hostname}:${this._port}/job/clear`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            'auth': {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            body: {
                queueId: queueId
            },
            method: 'POST',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };

        try {
            return await rp(options);
        } catch (error) {
            console.error("Failed to verify Dispatch connection.");
            throw error
        }
    }

    public async CompleteSpecificJob(job: DispatchJob) {
        return await this.CompleteJob(job.queueId, job.jobId)
    }

    public async CompleteJob(queueId: string, jobId: string): Promise<void> {
        if (!queueId || queueId == '') {
            return Promise.reject("Invalid queueId")
        }
        if (!jobId || jobId == '') {
            return Promise.reject("Invalid jobId")
        }

        let options = {
            uri: `${this._hostname}:${this._port}/job/complete/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            auth: {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            body: {
                queueId: queueId,
                jobId: jobId
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };
        try {
            return await rp(options);
        } catch (e) {
            throw Error(`Failed to complete job ${e}`)
        }
    }

    /**
     * Submit a new job on the specified application queue.
     *
     * @param {string} queueId The queueId.
     * @param data The job's data.
     * @param previousJobs Any jobs that caused this job.
     * @returns {Promise<void>}
     * @constructor
     */
    public async SubmitJob(queueId: string, data: any, previousJobs: string[] = null): Promise<void> {
        if (!queueId || queueId == '') {
            return Promise.reject("Invalid queueId")
        }

        let options = {
            uri: `${this._hostname}:${this._port}/job/submit/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            auth: {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            body: {
                queueId: queueId,
                data: data
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };
        try {
            return await rp(options);
        } catch (e) {
            throw Error(`Failed to submit job ${e}`)
        }
    }

    /**
     * Returns a job if there is one waiting, else null
     *
     * @param {string} queueId The of the queue we want jobs from.
     * @param {number} jobTimeoutSeconds The number of seconds before assuming a job fails.
     * @param {number} longPollingSeconds The max number of seconds before returning with no job.
     * @returns {Promise<DispatchJob>} The magnum microservice job or null.
     * @constructor
     */
    public async RequestJob(queueId: string, jobTimeoutSeconds: number = 20, longPollingSeconds: number = -1): Promise<DispatchJob> {
        let dispatchClient = this; // Needed for inside the promise as it goes out of 'scope'

        if (jobTimeoutSeconds < 40) {
            jobTimeoutSeconds = 40;
        }
        if (longPollingSeconds > 20) {
            return Promise.reject("Invalid long polling seconds, must be < 20")
        }
        let timeoutModifier = longPollingSeconds;
        if (timeoutModifier < 0) {
            timeoutModifier = 0;
        }
        let options = {
            uri: `${this._hostname}:${this._port}/job/request/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            auth: {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            body: {
                queueId: queueId,
                "jobHandleTimeoutSeconds": jobTimeoutSeconds,
                timeout: longPollingSeconds
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier + (timeoutModifier * 1000)
        };

        try {
            let data = await rp(options);
            if (!data.jobId) {
                return null;
            }
            return new DispatchJob(data.jobId, queueId, data.data, dispatchClient);
        } catch (error) {
            throw Error(`Failed to request job ${error}`);
        }
    }
}

export class DispatchJob {
    public jobId: string;
    public queueId: string;
    public data: any;
    private dispatchClient: DispatchClient;

    constructor(jobId: string, queueId: string, data: any, dispatchClient: DispatchClient) {
        this.jobId = jobId;
        this.queueId = queueId;
        this.data = data;
        this.dispatchClient = dispatchClient;
    }

    public async Complete(): Promise<void> {
        return await this.dispatchClient.CompleteSpecificJob(this);
    }
}

export class SslOptions {
    private _useSsl: boolean = true;
    private _verifySsl: boolean = true;

    get verifySsl(): boolean {
        return this._verifySsl;
    }

    set verifySsl(value: boolean) {
        this._verifySsl = value;
    }

    private _sslCert: string;

    get sslCert(): string {
        return this._sslCert;
    }

    set sslCert(value: string) {
        this._sslCert = value;
    }
}


