'use strict';

var util = require('util');
var events = require('events');
var amqp = require('amqplib');
var async = require('async');

function Client(url, options) {
  events.EventEmitter.call(this);

  this.url = url || null;
  this.options = options || {};

  this.connection = null;
  this.workers = [];
}

util.inherits(Client, events.EventEmitter);

Client.prototype.addWorker = function addWorker(worker) {
  worker.on('complete', function(data) {
    this.emit('complete', data);
  }.bind(this));
  this.workers.push(worker);
};

Client.prototype.connect = function connect(callback) {
  var that = this;
  amqp.connect(this.url, this.options).then(function(conn) {
    conn.on('close', function(err) {
      that.connection = null;
      that.emit('close', {
        err: err
      });
    });

    conn.on('error', function(err) {
      that.connection = null;
      that.emit('error', {
        err: err
      });
    });

    that.connection = conn;

    async.series(that.workers.map(function(worker) {
      return function(cb) {
        worker.start(conn, cb);
      };
    }), callback);
  }).catch(function(err) {
    callback(err);
  });
};

Client.prototype.reconnect = function () {
  var reconnectTimeout = 3000;
  var me = this;
  console.log('Scheduling reconnect in ' + (reconnectTimeout / 1000) + 's');
  setTimeout(function () {
    console.log('now attempting reconnect ...');
    me.connect(function (err) {
      if(err) {
        me.reconnect()
      } else {
        console.log('client connected to server');
      }
    });
  }, reconnectTimeout);
};

Client.prototype.close = function close(callback) {
  callback = callback || function() {};
  var conn = this.connection;
  if (conn) {
    this.connection = null;
    return conn.close().then(function() {
      callback();
    });
  }
  callback();
};

module.exports = Client;
