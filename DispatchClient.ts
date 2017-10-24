import * as rp from "request-promise-native";

export class DispatchClient {
    private _hostname: string;
    private _port: number;
    private _sslOptions: SslOptions;
    private _secretKey: string;
    private _accessKey: string;

    /**
     * Creates a new MMM Client
     *
     * @param {string} hostname The hostname of the MMM server (example: https://127.0.0.1)
     * @param {number} port The port of the MMM server (default 6883)
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
        if (!sslOptions.verifySsl) {
            // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            // TODO figure out how best to sort invalid SSL certs.
        }

    }

    /**
     * Checks the status of the Magnum Microservice Server
     *
     * @returns {Promise<boolean>}
     * @constructor
     */
    public StatusCheck(): Promise<boolean> {
        let options = {
            uri: `${this._hostname}:${this._port}/job/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            'auth': {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            method: 'GET',
            json: true,
            timeout: 8000
        };
        return new Promise<boolean>(function (resolve, reject) {
            rp(options).then(function (data) {
                if (data.status == "OK") {
                    return resolve(true)
                } else {
                    return resolve(false)
                }
            }).catch(function (error) {
                console.error("Failed to verify MMM_Connection");
                return reject(error);
            })
        });

    }

    public CompleteSpecificJob(job: MagnumMicroserviceJob) {
        return this.CompleteJob(job.appId, job.jobId)
    }

    public CompleteJob(appId: string, jobId: string): Promise<void> {
        if (!appId || appId == '') {
            return Promise.reject("Invalid appId")
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
                appId: appId,
                jobId: jobId
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: 8000
        };
        return new Promise<void>((resolve, reject) => {
            rp(options).then(value => {
                resolve()
            }).catch(reason => {
                reject(reason)
            })
        });
    }

    /**
     * Submit a new job on the specified application queue.
     *
     * @param {string} appId The appId.
     * @param data The job's data.
     * @param previousJobs Any jobs that caused this job.
     * @returns {Promise<void>}
     * @constructor
     */
    public SubmitJob(appId: string, data: any, previousJobs: string[] = null): Promise<void> {
        if (!appId || appId == '') {
            return Promise.reject("Invalid appId")
        }

        let options = {
            uri: `${this._hostname}:${this._port}/job/submit/`,
            rejectUnauthorized: this._sslOptions.verifySsl,
            auth: {
                'user': this._accessKey,
                'pass': this._secretKey
            },
            body: {
                appId: appId,
                data: data
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: 8000
        };
        return new Promise<void>((resolve, reject) => {
            rp(options).then(value => {
                resolve()
            }).catch(reason => {
                reject(reason)
            })
        });
    }

    /**
     * Returns a job if there is one waiting, else null
     *
     * @param {string} appId The of the queue we want jobs from.
     * @param {number} jobTimeoutSeconds The number of seconds before assuming a job fails.
     * @param {number} longPollingSeconds The max number of seconds before returning with no job.
     * @returns {Promise<MagnumMicroserviceJob>} The magnum microservice job or null.
     * @constructor
     */
    public GetJob(appId: string, jobTimeoutSeconds: number = 20, longPollingSeconds: number = -1): Promise<MagnumMicroserviceJob> {
        let mmmClient = this; // Needed for inside the promise as it goes out of 'scope'

        if (jobTimeoutSeconds < 10) {
            jobTimeoutSeconds = 10;
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
                appId: appId,
                "jobHandleTimeoutSeconds": jobTimeoutSeconds,
                timeout: longPollingSeconds
            },
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            json: true,
            timeout: 8000 + (timeoutModifier * 1000)
        };

        return new Promise<MagnumMicroserviceJob>(function (resolve, reject) {
            rp(options).then(value => {
                if (!value.jobId) {
                    return resolve(null);
                }
                let job = new MagnumMicroserviceJob(value.jobId, appId, value.data, mmmClient);
                resolve(job);
            }).catch(reason => {
                return reject(reason)
            })
        });
    }
}

export class MagnumMicroserviceJob {
    public jobId: string;
    public appId: string;
    public data: any;
    private mmmClient: DispatchClient;

    constructor(jobId: string, appId: string, data: any, mmmClient: DispatchClient) {
        this.jobId = jobId;
        this.appId = appId;
        this.data = data;
        this.mmmClient = mmmClient;
    }

    public Complete(): Promise<void> {
        return this.mmmClient.CompleteSpecificJob(this);
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


