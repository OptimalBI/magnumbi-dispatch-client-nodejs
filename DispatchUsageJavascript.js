const dispatch = require("./DispatchClient");
const testQueueName = "EXAMPLE";
async function run() {
    let sslOptions = new dispatch.SslOptions();
    sslOptions.verifySsl = false; // For development use only!

    // Create a new client.
    let dispatchClient = new dispatch.DispatchClient(
        "https://127.0.0.1",
        6883,
        "test",
        "token",
        sslOptions
    );

    // Check the connection to the server.
    let statusResponse = await dispatchClient.StatusCheck();
    if (!statusResponse) {
        throw new Error("Failed to connect to the magnumbi dispatch server");
    }

    // Lets check the connection to the server.
    let statusResult = await dispatchClient.StatusCheck();

    // Clear the queue to get a nice clean start.
    await dispatchClient.ClearQueue(testQueueName);

    // Add a job to a queue.
    await dispatchClient.SubmitJob(testQueueName, {message: "Hello "});

    // Add another job to the queue (note Dispatch does not guarantee order of jobs, just tries its best).
    await dispatchClient.SubmitJob(testQueueName, {message: "world."});

    // Now lets grab a job off the queue.
    let job1 = await dispatchClient.RequestJob(testQueueName, 20, -1);

    // and use the jobs data for something
    let s = job1.data.message;

    // and grab a second job
    let job2 = await dispatchClient.RequestJob(testQueueName, 20, -1);

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

