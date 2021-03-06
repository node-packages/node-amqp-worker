'use strict';

var util = require('util');
var events = require('events');

function Worker(name, handler, options) {
  events.EventEmitter.call(this);

  options = options || {};
  this.name = name;
  this.options = options.queue || {};
  this.exchange = options.exchange || {};
  this.handler = handler;
  this.handlerOptions = options.consumer || {};
  this.prefetchCount = options.count || 0;
  this.requeue = (typeof options.requeue !== 'undefined') ?
    options.requeue : true;

  this.channel = null;
  this.status = {};
  this.consumer = {};
}

util.inherits(Worker, events.EventEmitter);

Worker.prototype.start = function(conn, callback) {
  var that = this;
  var work = function(msg) {
    that.handler(msg, function(err, result) {
      if (!that.handlerOptions.noAck) {
        if (err) {
          that.channel.nack(msg, false, that.requeue);
        } else {
          that.channel.ack(msg);
        }
      }
      that.emit('complete', {
        err: err,
        result: result,
        msg: msg
      });
    });
  };

  conn.createChannel().then(function(chan) {
    that.channel = chan;
    that.channel.prefetch(that.prefetchCount);
    return that.channel.assertQueue(that.name, that.options);
  }).then(function () {
      return that.channel.assertExchange(that.exchange.name, that.exchange.type || 'topic');
  }).then(function () {
      return that.channel.bindQueue(that.name, that.exchange.name, that.exchange.routingKey);
  }).then(function(status) {
    that.status = status;
    return that.channel.consume(that.name, work, that.handlerOptions);
  }).then(function() {
    callback();
  }).catch(function(err) {
    callback(err);
  });
};

module.exports = Worker;
