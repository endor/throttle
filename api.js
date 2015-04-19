var request = require('request');
var Q = require('q');

module.exports = {
  endpoint: null,
  token: null,

  get: function(path) {
    return this.request('GET', this.endpoint + path, undefined);
  },
  post: function(path, data) {
    return this.request('POST', this.endpoint + path, data);
  },
  put: function(path, data) {
    return this.request('PUT', this.endpoint + path, data);
  },
  delete: function(path) {
    return this.request('DELETE', this.endpoint + path, undefined);
  },

  request: function(verb, uri, data) {
    var deferred = Q.defer();

    var requestOptions = {
      method: verb,
      uri: uri
    };

    if(data) {
      requestOptions.form = data;
    }

    if(this.token) {
      requestOptions.qs = {token: this.token};
    }

    request(requestOptions, function(err, response, body) {
      if(err) {
        deferred.reject(new Error(err));
      } else if(response.statusCode > 206) {
        deferred.reject(new Error('Unexpected response ' + response.statusCode + ' for ' + uri + ': ' + response.body));
      } else {
        deferred.resolve(body);
      }
    });

    return deferred.promise;
  }
};