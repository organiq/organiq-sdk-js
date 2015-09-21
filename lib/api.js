var rest = require('restler');
var when = require('when');
var debug = require('debug')('organiq:admin');

module.exports = AdministrativeApi;

function AdministrativeApi(apiRoot, options) {
  if (!(this instanceof AdministrativeApi)) {
    return new AdministrativeApi(apiRoot, options);
  }

  function _createDevice(alias, productId) {
    var device_info = {
      alias: alias,
      version: "0.0.1",
      product: productId
    };
    return when.promise(function (resolve, reject) {
      rest.postJson(apiRoot + '/devices/', device_info, options).on('complete',
        function (data, response) {
          if (data instanceof Error) {
            return reject(data);
          }
          if (response.statusCode !== 201) {
            debug('failed _createDevice: code: ' + response.statusCode);
            return reject(Error(data));
          }
          return resolve(response.device_id);
        });
    });
  }

  function _createProduct(alias) {
    var product_info = {
      name: name
    };
    return when.promise(function (resolve, reject) {
      rest.postJson(apiRoot + '/products/', product_info, options).on('complete',
        function (data, response) {
          if (data instanceof Error) {
            return reject(data);
          }
          if (response.statusCode !== 201) {
            debug('failed _createProduct: code: ' + response.statusCode);
            return reject(Error(data));
          }
          return resolve(response.product_id);
        });
    });
  }

  function _getDeviceId(alias) {
    return when.promise(function (resolve, reject) {
      var aliasSafe = encodeURIComponent(alias);
      rest.get(apiRoot + '/devices/?alias=' + aliasSafe, options).on('complete',
        function (data, response) {
          void(response);
          if (data instanceof Error) {
            return reject(data);
          }
          if (response.statusCode !== 200) {
            return reject(Error(''+response.statusCode + ': ' + response.statusMessage));
          }
          if (data.length !== 1) {
            return reject(Error('There is no device defined with the alias: \'' +
                                alias + '\''));
          }
          return resolve(data[0]['device_id']);
        });
    });
  }

  this.getDeviceIdByAlias = function (alias) {
    return _getDeviceId(alias);
  };
}


