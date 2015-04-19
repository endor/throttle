var request = require('request');

module.exports = {
  endpoint: null,
  token: null,
  get: function(path) {
    this.request('GET', this.endpoint + path);
  },
  post: function(path) {
    this.request('POST', this.endpoint + path);
  },
  put: function(path) {
    this.request('PUT', this.endpoint + path);
  },
  delete: function(path) {
    this.request('DELETE', this.endpoint + path);
  },
  request: function(verb, uri) {
    request({
      method: verb,
      uri: uri
    });
  }
};