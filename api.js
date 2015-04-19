var request = require('request');
var fs = require('fs');
var Q = require('q');
var _ = require('underscore');

var queueInterval = null,
  queue = [],
  queueLog = [],
  queueStarted = false,
  allowedNumberOfRequests = 600,
  perSeconds = 600;

function countEntriesInLog() {
  return _.reduce(queueLog, function(count, requests) {
    return count + requests;
  }, 0);
}

function workOffQueue() {
  if(countEntriesInLog() < allowedNumberOfRequests && queue.length > 0) {
    var entry = queue.shift();
    entry.callback(entry.requestOptions, entry.deferred);
    queueLog[queueLog.length - 1] += 1;
    workOffQueue();
  }
}

function updateLogs() {
  queueInterval = setInterval(function() {
    queueLog.shift();

    if(queueLog.length < perSeconds) {
      queueLog.push(0);
    }

    workOffQueue();
  }, 1000);
}

function startQueue(throttle) {
  if(!queueStarted) {
    if(queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }

    allowedNumberOfRequests = (throttle && throttle.requests) || 600;
    perSeconds = (throttle && throttle.seconds) || 600;

    queueStarted = true;
    queue = [];
    queueLog = [];

    _.each(_.range(perSeconds), function() {
      queueLog.push(0);
    });

    updateLogs();
  }
}

function logError(err, callback) {
  fs.appendFile('request_log.txt', err + '\n', function() {
    callback();
  });
}

function throttleRequest(callback, requestOptions, deferred, throttle) {
  startQueue(throttle);
  queue.push({callback: callback, requestOptions: requestOptions, deferred: deferred});
  workOffQueue();
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
    queueStarted = false;
    startQueue(this.throttle);
  },

  sendRequest: sendRequest
};
