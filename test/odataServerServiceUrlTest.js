/* eslint-env mocha */
require('should');
const ODataServer = require('../lib/odataServer');

function createReq ({ originalUrl = '/', url = '/', protocol = 'http', host = 'localhost:1234' } = {}) {
  return {
    originalUrl,
    url,
    protocol,
    get: function (header) {
      if (header.toLowerCase() === 'host') {
        return host;
      }
      return undefined;
    }
  };
}

describe('_buildServiceUrl', function () {
  it('builds service url from request mount path when serviceUrl is not provided in constructor', function () {
    const server = new ODataServer();
    const req = createReq({
      protocol: 'https',
      host: 'example.com',
      originalUrl: '/odata/tenant/context/id/users',
      url: '/users'
    });

    const result = server._buildServiceUrl(req);
    result.should.be.eql('https://example.com/odata/tenant/context/id');
  });

  it('falls back to root path when mount path is empty', function () {
    const server = new ODataServer();
    const req = createReq({
      protocol: 'https',
      host: 'example.com',
      originalUrl: '/',
      url: '/'
    });

    const result = server._buildServiceUrl(req);
    result.should.be.eql('https://example.com/');
  });

  it('uses constructor serviceUrl as base when provided', function () {
    const server = new ODataServer('https://custom-base/api');
    const req = createReq({
      originalUrl: '/odata/tenant',
      url: '/tenant'
    });

    const result = server._buildServiceUrl(req);
    result.should.be.eql('https://custom-base/api/odata');
  });

  it('handles Portfolio instance route and strips collection segment', function () {
    const server = new ODataServer();
    const req = createReq({
      protocol: 'https',
      host: 'bandicoot.example.com',
      originalUrl: '/odata/3e412732-b00a-4c34-ae5f-29a12eab74c6/Portfolio/176495733/Portfolio',
      url: '/Portfolio'
    });

    const result = server._buildServiceUrl(req);
    result.should.be.eql('https://bandicoot.example.com/odata/3e412732-b00a-4c34-ae5f-29a12eab74c6/Portfolio/176495733');
  });
});
