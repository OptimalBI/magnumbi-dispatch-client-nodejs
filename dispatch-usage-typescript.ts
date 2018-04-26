import {DispatchClient, SslOptions} from "./dispatch-client";

let sslOptions = new SslOptions();
sslOptions.verifySsl = false;

const testQueueName = "EXAMPLE";

async function run(): Promise<void> {
    let mmmClient = new DispatchClient(
        "https://127.0.0.1",
        6883,
        "test",
        "token",
        sslOptions
    );

    // Lets check the connection to the server.
    let statusResult = await mmmClient.StatusCheck();

    // Clear the queue to get a nice clean start.
    await mmmClient.ClearQueue(testQueueName);

    // Add a job to a queue.
    await mmmClient.SubmitJob(testQueueName, {message: "Hello "});

    // Add another job to the queue (note Dispatch does not guarantee order of jobs, just tries its best).
    await mmmClient.SubmitJob(testQueueName, {message: "world."});

    // Now lets grab a job off the queue.
    let job1 = await mmmClient.RequestJob(testQueueName, 20, -1);

    // and use the jobs data for something
    let s = job1.data.message;

    // and grab a second job
    let job2 = await mmmClient.RequestJob(testQueueName, 20, -1);

    // use data again
    s += job2.data.message;

    // Should print "Hello world."
    console.log(s);

    // Complete the jobs so that the Dispatch server knows we handled them successfully.
    await job1.Complete();
    await job2.Complete();
}

run().then(() => {
    console.log("Examples complete!")
}).catch(reason => {
    console.log("Examples failed! " + reason)
});


