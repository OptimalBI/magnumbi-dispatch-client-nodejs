import * as rp_dispatch from "request-promise-native";
import * as http from "http";
import * as https from "https";
import {Agent, IncomingMessage} from "http";
import {Agent as Agents, RequestOptions} from "https";
import {RequestPromiseOptions} from "request-promise-native";

export class DispatchClient {
    private _hostname: string;
    private _port: number;
    private _sslOptions: SslOptions;
    private _secretKey: string;
    private _accessKey: string;
    private static readonly _jobTimeoutModifier : number = 12000;
    private _agent : Agent | Agents;

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
        if(this._hostname.startsWith("https")){
            this._agent = new Agents();
        } else {
            this._agent = new Agent();
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
            agent: this._agent,
            method: 'GET',
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };
        return new Promise<boolean>(function (resolve, reject) {
            rp_dispatch(options).then(function (data) {
                if (data.status == "OK") {
                    return resolve(true)
                } else {
                    return resolve(false)
                }
            }).catch(function (error) {
                console.error("Failed to verify Dispatch connection.");
                return reject(error);
            })
        });

    }

    public CompleteSpecificJob(job: DispatchJob) {
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
            forever: false,
            json: true,
            timeout: DispatchClient._jobTimeoutModifier
        };
        return new Promise<void>((resolve, reject) => {
            rp_dispatch(options).then(value => {
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
            timeout: DispatchClient._jobTimeoutModifier
        };
        return new Promise<void>((resolve, reject) => {
            rp_dispatch(options).then(value => {
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
     * @returns {Promise<DispatchJob>} The magnum microservice job or null.
     * @constructor
     */
    public async RequestJob(appId: string, jobTimeoutSeconds: number = 20, longPollingSeconds: number = -1): Promise<DispatchJob> {
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
        let options : RequestPromiseOptions = {
            // uri: `${this._hostname}:${this._port}/job/request/`,
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
            timeout: DispatchClient._jobTimeoutModifier + (timeoutModifier * 1000)
        };
        // let jobResult = await rp_dispatch(options);
        let jobResult = await rp_dispatch.post(`${this._hostname}:${this._port}/job/request/`,options);

        if (!jobResult.jobId) {
            return null;
        }
        return new DispatchJob(jobResult.jobId, appId, jobResult.data, dispatchClient);
    }

    public async RequestJobNative(appId: string, jobTimeoutSeconds: number = 20, longPollingSeconds: number = -1): Promise<DispatchJob> {
        let timeoutModifier = longPollingSeconds;
        if (timeoutModifier < 0) {
            timeoutModifier = 0;
        }
        let hostIp = this._hostname.split("/")[2];
        let options : RequestOptions = {
            hostname: `${hostIp}`,
            port: this._port,
            method: "POST",
            path: "/job/request/",
            rejectUnauthorized: this._sslOptions.verifySsl,
            auth: `${this._accessKey}:${this._secretKey}`,
            agent: false,
            timeout: DispatchClient._jobTimeoutModifier + (timeoutModifier * 1000)
        };

        let result = await new Promise<IncomingMessage>((resolve, reject) =>{
            https.request(options, res => {
                console.log(res);
                resolve(res);
            });
        });
        console.log(result);
        return null;
    }
}

export class DispatchJob {
    public jobId: string;
    public appId: string;
    public data: any;
    private dispatchClient: DispatchClient;

    constructor(jobId: string, appId: string, data: any, dispatchClient: DispatchClient) {
        this.jobId = jobId;
        this.appId = appId;
        this.data = data;
        this.dispatchClient = dispatchClient;
    }

    public Complete(): Promise<void> {
        return this.dispatchClient.CompleteSpecificJob(this);
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


