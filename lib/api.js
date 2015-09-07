var rest = require('restler');
var when = require('when');
var debug = require('debug')('organiq:admin');

module.exports = AdministrativeApi;

function AdministrativeApi(apiRoot, options) {
  if (!(this instanceof AdministrativeApi)) {
    return new AdministrativeApi(apiRoot, options);
  }

  function _createDevice(alias) {
    var device_info = {
      alias: alias,
      version: "0.0.1"
    };
    return when.promise(function (resolve, reject) {
      rest.postJson(apiRoot + '/devices/', device_info, options).on('complete',
        function (data, response) {
          if (data instanceof Error) {
            return reject(data);
          }
          if (response.statusCode !== 201) {
            debug('failed _createDevice: code: ' + response.statusCode);
            return reject(Error(response));
          }
          return resolve(response.device_id);
        });
    });
  }

  function _getDeviceId(alias) {
    return when.promise(function (resolve, reject) {
      alias = encodeURIComponent(alias);
      rest.get(apiRoot + '/devices/?alias=' + alias, options).on('complete',
        function (data, response) {
          if (data instanceof Error) {
            return reject(data);
          }
          if (data.length !== 1) {
            debug('data.length is not 1, data is ' + JSON.stringify(data));
            return reject(Error('Not found'));
          }
          return resolve(data[0]['device_id']);
        });
    });
  }

  this.getOrCreateDeviceByAlias = function (alias) {
    return _getDeviceId(alias).then(null, function (err) {
      void(err);
      _createDevice(alias).then(function () {
        return _getDeviceId(alias);
      });
    });
  };

  this.getDeviceIdByAlias = function (alias) {
    return _getDeviceId(alias).then(null, function (err) {
      void(err);
      _createDevice(alias).then(function () {
        return _getDeviceId(alias);
      });
    });
  };
}


