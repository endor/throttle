var request = require('request');
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');

var queueInterval = null,
  startedQueue = null;

function Queue(throttle) {
  if(queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
  }

  this.allowedNumberOfRequests = (throttle && throttle.requests) || 600;
  this.perSeconds = (throttle && throttle.seconds) || 600;
  this.queue = [];
  this.log = [];

  _.each(_.range(this.perSeconds), function() {
    this.log.push(0);
  }.bind(this));

  this.updateLogs();
}

Queue.prototype.push = function(entry) {
  this.queue.push(entry);
};

Queue.prototype.updateLogs = function() {
  queueInterval = setInterval(function(queue) {
    queue.log.shift();

    if(queue.log.length < queue.perSeconds) {
      queue.log.push(0);
    }

    queue.workOff();
  }, 1000, this);
};

Queue.prototype.workOff = function() {
  while(this.countEntriesInLog() < this.allowedNumberOfRequests && this.queue.length > 0) {
    var entry = this.queue.shift();
    entry.callback(entry.requestOptions, entry.deferred);
    this.log[this.log.length - 1] += 1;
  }
};

Queue.prototype.countEntriesInLog = function() {
  return _.sum(this.log);
};

function getLocalQueue(throttle) {
  if(!startedQueue) {
    startedQueue = new Queue(throttle);
  }

  return startedQueue;
}


function logError(err, callback) {
  fs.appendFile('request_log.txt', err + '\n', function() {
    callback();
  });
}

function throttleRequest(callback, requestOptions, deferred, throttle) {
  var queue = getLocalQueue(throttle);
  queue.push({callback: callback, requestOptions: requestOptions, deferred: deferred});
  queue.workOff();
}

function sendRequest(requestOptions, deferred) {
  request(requestOptions, function(err, response, body) {
    if(err) {
      logError(err, function() {
        deferred.reject(new Error(err));
      });
    } else if(response.statusCode > 206) {
      var errorMessage = 'Unexpected response ' + response.statusCode + ' for ' +
        requestOptions.uri + ': ' + response.body;
      logError(errorMessage, function() {
        deferred.reject(new Error(errorMessage));
      });
    } else {
      deferred.resolve(body);
    }
  });
}

function makeRequest(verb, sendRequest, uri, data, token, throttle) {
  var deferred = Q.defer();

  var requestOptions = {
    method: verb,
    uri: uri
  };

  if(data) {
    requestOptions.form = data;
  }

  if(token) {
    requestOptions.qs = {token: token};
  }

  throttleRequest(sendRequest, requestOptions, deferred, throttle);

  return deferred.promise;
}

module.exports = {
  endpoint: null,
  token: null,
  throttle: {
    requests: 600,
    seconds: 600
  },

  get: function(path) {
    return makeRequest('GET', this.sendRequest, this.endpoint + path, undefined, this.token, this.throttle);
  },
  post: function(path, data) {
    return makeRequest('POST', this.sendRequest, this.endpoint + path, data, this.token, this.throttle);
  },
  put: function(path, data) {
    return makeRequest('PUT', this.sendRequest, this.endpoint + path, data, this.token, this.throttle);
  },
  delete: function(path) {
    return makeRequest('DELETE', this.sendRequest, this.endpoint + path, undefined, this.token, this.throttle);
  },

  resetQueue: function() {
    startedQueue = null;
    getLocalQueue(this.throttle);
  },

  sendRequest: sendRequest
};
