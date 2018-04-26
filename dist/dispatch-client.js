"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const rp = require("request-promise-native");
/**
 * The client for the MagnumBI Dispatch framework.
 */
class DispatchClient {
    /**
     * Creates a new Dispatch Client
     *
     * @param {string} hostname The hostname of the Dispatch server (example: https://127.0.0.1)
     * @param {number} port The port of the Dispatch server (default 6883)
     * @param {string} accessKey The access key for authentication
     * @param {string} secretKey The secret key for authentication
     * @param {SslOptions} sslOptions Optional ssl options
     */
    constructor(hostname, port, accessKey, secretKey, sslOptions = null) {
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
    StatusCheck() {
        return __awaiter(this, void 0, void 0, function* () {
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
                let data = yield rp(options);
                return data.status == "OK";
            }
            catch (error) {
                return Promise.reject(`Failed to check status ${error}`);
            }
        });
    }
    /**
     * Removes all pending jobs from the specified queue.
     *
     * @param {string} queueId
     * @returns {Promise<boolean>}
     * @constructor
     */
    ClearQueue(queueId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                return yield rp(options);
            }
            catch (error) {
                console.error("Failed to verify Dispatch connection.");
                throw error;
            }
        });
    }
    CompleteSpecificJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.CompleteJob(job.queueId, job.jobId);
        });
    }
    CompleteJob(queueId, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!queueId || queueId == '') {
                return Promise.reject("Invalid queueId");
            }
            if (!jobId || jobId == '') {
                return Promise.reject("Invalid jobId");
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
                return yield rp(options);
            }
            catch (e) {
                throw Error(`Failed to complete job ${e}`);
            }
        });
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
    SubmitJob(queueId, data, previousJobs = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!queueId || queueId == '') {
                return Promise.reject("Invalid queueId");
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
                return yield rp(options);
            }
            catch (e) {
                throw Error(`Failed to submit job ${e}`);
            }
        });
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
    RequestJob(queueId, jobTimeoutSeconds = 20, longPollingSeconds = -1) {
        return __awaiter(this, void 0, void 0, function* () {
            let dispatchClient = this; // Needed for inside the promise as it goes out of 'scope'
            if (jobTimeoutSeconds < 40) {
                jobTimeoutSeconds = 40;
            }
            if (longPollingSeconds > 20) {
                return Promise.reject("Invalid long polling seconds, must be < 20");
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
                let data = yield rp(options);
                if (!data.jobId) {
                    return null;
                }
                return new DispatchJob(data.jobId, queueId, data.data, dispatchClient);
            }
            catch (error) {
                throw Error(`Failed to request job ${error}`);
            }
        });
    }
}
DispatchClient._jobTimeoutModifier = 12000;
exports.DispatchClient = DispatchClient;
class DispatchJob {
    constructor(jobId, queueId, data, dispatchClient) {
        this.jobId = jobId;
        this.queueId = queueId;
        this.data = data;
        this.dispatchClient = dispatchClient;
    }
    Complete() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.dispatchClient.CompleteSpecificJob(this);
        });
    }
}
exports.DispatchJob = DispatchJob;
class SslOptions {
    constructor() {
        this._useSsl = true;
        this._verifySsl = true;
    }
    get verifySsl() {
        return this._verifySsl;
    }
    set verifySsl(value) {
        this._verifySsl = value;
    }
    get sslCert() {
        return this._sslCert;
    }
    set sslCert(value) {
        this._sslCert = value;
    }
}
exports.SslOptions = SslOptions;
//# sourceMappingURL=dispatch-client.js.map