var request = require('request');

module.exports = {
  endpoint: null,
  token: null,

  get: function(path) {
    this.request('GET', this.endpoint + path, undefined);
  },
  post: function(path, data) {
    this.request('POST', this.endpoint + path, data);
  },
  put: function(path, data) {
    this.request('PUT', this.endpoint + path, data);
  },
  delete: function(path) {
    this.request('DELETE', this.endpoint + path, undefined);
  },

  request: function(verb, uri, data) {
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

    request(requestOptions);
  }
};