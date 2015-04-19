var chai = require('chai');
var nock = require('nock');
var api = require('../api');
var expect = chai.expect;

describe('api', function() {
  describe('configure endpoint and token', function() {
    it('has a null endpoint if not set', function() {
      expect(api.endpoint).to.be.null;
    });

    it('allows me to set an endpoint', function() {
      api.endpoint = 'http://example.com';
      expect(api.endpoint).to.equal('http://example.com');
    });

    it('has a null token if not set', function() {
      expect(api.token).to.be.null;
    });

    it('allows me to set a token', function() {
      api.token = 'ABC';
      expect(api.token).to.equal('ABC');
    });
  });

  describe('make http requests', function() {
    var assertDone = function(scope, done) {
      setTimeout(function() {
        scope.done();
        done();
      }, 5);
    };

    before(function() {
      api.endpoint = 'http://example.com';
    });

    it('allows me to do a get request', function(done) {
      var scope = nock('http://example.com').get('/campaigns').reply(200);
      api.get('/campaigns');
      assertDone(scope, done);
    });

    it('allows me to do a post request', function(done) {
      var scope = nock('http://example.com').post('/campaigns').reply(200);
      api.post('/campaigns');
      assertDone(scope, done);
    });

    it('allows me to do a put request', function(done) {
      var scope = nock('http://example.com').put('/campaigns/1').reply(200);
      api.put('/campaigns/1');
      assertDone(scope, done);
    });

    it('allows me to do a delete request', function(done) {
      var scope = nock('http://example.com').delete('/campaigns/1').reply(200);
      api.delete('/campaigns/1');
      assertDone(scope, done);
    });
  });
});
