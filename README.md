# Nodejs - MagnumBI Dispatch Client Repository.

MagnumBI Dispatch manages microservice communication and interaction simply.   
It is easy to develop and integrate with your small to medium sized development teams.   
To see more about MagnumBI Dispatch and download the server [click here](https://github.com/OptimalBI/magnumbi-dispatch-server)   

## Requirements

Tested with nodejs v9.4.0

## Getting started

Clone this project to start.  
 See the example below for more details.


## Examples

```typescript
import {DispatchClient, DispatchJob, SslOptions} from "./DispatchClient";
let sslOptions = new SslOptions();
sslOptions.verifySsl = false;

let mmmClient = new DispatchClient(
    "https://127.0.0.1",
    6883,
    "test",
    "token",
    sslOptions
);

// Lets check the connection to the server.
let statusResult = await mmmClient.StatusCheck();
```

For more example see the the file DispatchUsageTypescript.ts ot DispatchUsageJavascript.js.