import {DispatchClient, DispatchJob, SslOptions} from "./dispatch-client";

let sslOptions = new SslOptions();
sslOptions.verifySsl = false;

let mmmClient = new DispatchClient("https://127.0.0.1",
    6883,
    "test",
    "token",
    sslOptions
);

mmmClient.SubmitJob("TEST", {TEST: "Data", Nested: {"1": 2}}).then(value => {
    console.log("Added a job to test!");
    emptyJobQueue(mmmClient, "TEST").then(value => {
        console.log("Cleared queue TEST!")
    });
});


function emptyJobQueue(mmmClient: DispatchClient, appId: string): Promise<void> {
    return mmmClient.RequestJob(appId).then(value => {
        if (value == null) {
            console.log("No job found");
            return Promise.resolve();
        } else {
            console.log("Found job");
            return value.Complete().then(_ => {
                return emptyJobQueue(mmmClient, appId);
            });
        }
    }).catch(reason => {
        return Promise.reject(reason);
    })
}


let a = {
    j: {
        "a": 1,
        "b": 2
    }

};
let flat_j = {
    "j_a": 1,
    "j_b": 2
};
