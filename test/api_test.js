var fs = require('fs');
var chai = require('chai');
var nock = require('nock');
var sinon = require('sinon');
var api = require('../api');
var expect = chai.expect;

describe('api', function() {
  var assertDone = function(scope, done) {
    setTimeout(function() {
      scope.done();
      done();
    }, 5);
  };

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

  describe('make requests', function() {
    beforeEach(function() {
      api.endpoint = 'http://example.com';
      api.token = null;
      nock.cleanAll();
    });

    describe('make http requests', function() {
      it('allows me to do a get request', function(done) {
        var scope = nock('http://example.com').get('/campaigns').reply(200);
        api.get('/campaigns');
        assertDone(scope, done);
      });

      it('allows me to do a post request', function(done) {
        var scope = nock('http://example.com').post('/campaigns').reply(201);
        api.post('/campaigns');
        assertDone(scope, done);
      });

      it('allows me to do a put request', function(done) {
        var scope = nock('http://example.com').put('/campaigns/1').reply(201);
        api.put('/campaigns/1');
        assertDone(scope, done);
      });

      it('allows me to do a delete request', function(done) {
        var scope = nock('http://example.com').delete('/campaigns/1').reply(204);
        api.delete('/campaigns/1');
        assertDone(scope, done);
      });
    });

    describe('send data', function() {
      it('allows me to send data with post requests', function(done) {
        var scope = nock('http://example.com').post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        }).reply(201);
        api.post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        });
        assertDone(scope, done);
      });

      it('allows me to send data with put requests', function(done) {
        var scope = nock('http://example.com').put('/campaigns/1', {
          name: 'Some campaign',
          budget: 500
        }).reply(201);
        api.put('/campaigns/1', {
          name: 'Some campaign',
          budget: 500
        });
        assertDone(scope, done);
      });
    });

    describe('send token', function() {
      it('sends the token as GET parameter with every request', function(done) {
        var scope = nock('http://example.com').post('/campaigns?token=ABC', {
          name: 'Some campaign',
          budget: 500
        }).reply(201);
        api.token = 'ABC';
        api.post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        });
        assertDone(scope, done);
      });
    });

    describe('return promise', function() {
      it('returns a promise that allows passing a success callback', function(done) {
        var scope = nock('http://example.com').post('/campaigns').reply(201);
        api.post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        }).then(function() {
          done();
        });
      });

      it('returns a promise that allows passing an error callback', function(done) {
        var scope = nock('http://example.com').post('/campaigns').reply(404);
        api.post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        }).then(null, function() {
          done();
        });
      });
    });

    describe('log errors', function() {
      it('logs error to request_log.txt', function(done) {
        var scope = nock('http://example.com').post('/campaigns').reply(401, 'Unauthorized');
        api.post('/campaigns', {
          name: 'Some campaign',
          budget: 500
        }).then(null, function() {
          fs.readFile('./request_log.txt', 'utf8', function(err, data) {
            if(err) {
              throw new Error(err);
            }

            expect(data).to.match(/Unexpected response 401/);
            done();
          });
        });
      });
    });

    describe('throttle requests', function() {
      this.timeout(5000);

      beforeEach(function() {
        sinon.stub(api, 'sendRequest');
      });

      afterEach(function() {
        api.sendRequest.restore();
      });

      it('does not send more requests than allowed', function(done) {
        api.throttle = {
          requests: 2,
          seconds: 4
        };
        api.resetQueue();
        api.post('/campaigns');
        api.post('/campaigns');
        api.post('/campaigns');

        setTimeout(function() {
          expect(api.sendRequest.calledTwice).to.be.true;
          done();
        }, 5);
      });

      it('does not send more requests per time than allowed', function(done) {
        api.throttle = {
          requests: 2,
          seconds: 1
        };
        api.resetQueue();
        api.post('/campaigns');
        api.post('/campaigns');

        setTimeout(function() {
          api.post('/campaigns');

          setTimeout(function() {
            expect(api.sendRequest.calledThrice).to.be.true;
            done();
          }, 5);
        }, 1001);
      });

      it('handles complex throttling', function(done) {
        api.throttle = {
          requests: 2,
          seconds: 3
        };
        api.resetQueue();

        api.put('/campaigns/1', {a: 1});
        api.put('/campaigns/1', {b: 2});
        api.put('/campaigns/1', {c: 3});

        expect(api.sendRequest.calledTwice).to.be.true;

        setTimeout(function() {
          expect(api.sendRequest.calledTwice).to.be.true;

          api.put('/campaigns/1', {d: 4});
          api.put('/campaigns/1', {e: 5});

          setTimeout(function() {
            expect(api.sendRequest.callCount).to.eql(4);
            done();
          }, 3001);
        }, 1001);
      });
    });
  });
});
