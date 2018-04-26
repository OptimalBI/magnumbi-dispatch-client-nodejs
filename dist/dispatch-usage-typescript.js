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
const dispatch_client_1 = require("./dispatch-client");
let sslOptions = new dispatch_client_1.SslOptions();
sslOptions.verifySsl = false;
const testQueueName = "EXAMPLE";
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let mmmClient = new dispatch_client_1.DispatchClient("https://127.0.0.1", 6883, "test", "token", sslOptions);
        // Lets check the connection to the server.
        let statusResult = yield mmmClient.StatusCheck();
        // Clear the queue to get a nice clean start.
        yield mmmClient.ClearQueue(testQueueName);
        // Add a job to a queue.
        yield mmmClient.SubmitJob(testQueueName, { message: "Hello " });
        // Add another job to the queue (note Dispatch does not guarantee order of jobs, just tries its best).
        yield mmmClient.SubmitJob(testQueueName, { message: "world." });
        // Now lets grab a job off the queue.
        let job1 = yield mmmClient.RequestJob(testQueueName, 20, -1);
        // and use the jobs data for something
        let s = job1.data.message;
        // and grab a second job
        let job2 = yield mmmClient.RequestJob(testQueueName, 20, -1);
        // use data again
        s += job2.data.message;
        // Should print "Hello world."
        console.log(s);
        // Complete the jobs so that the Dispatch server knows we handled them successfully.
        yield job1.Complete();
        yield job2.Complete();
    });
}
run().then(() => {
    console.log("Examples complete!");
}).catch(reason => {
    console.log("Examples failed! " + reason);
});
//# sourceMappingURL=dispatch-usage-typescript.js.map