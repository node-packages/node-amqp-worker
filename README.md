# node-amqp-worker

## Quick Start

```javascript
var lib = require('amqp-worker');
var Client = lib.Client;
var Worker = lib.Worker;

var client = new Client('amqp://localhost');

var worker = new Worker('queue_name', function(msg, callback) {
  // do stuff with msg
  if (err) {
    // nack the message
    return callback(err);
  }

  // ack the message
  callback(null, result);
});

worker.on('complete', function(data) {
  // this worker's handler completed a message
  console.log(data);
});

client.addWorker(worker);

client.on('complete', function(data) {
  // a worker handler completed a message
  console.log(data);
});

client.connect(function() {
  console.log('workers started');
});
```

For more details, see the [example](example/server.js).
