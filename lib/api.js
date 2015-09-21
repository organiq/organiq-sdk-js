var rest = require('restler');
var when = require('when');

module.exports = ConfigApi;

function ConfigApi(apiRoot, options) {
  if (!(this instanceof ConfigApi)) {
    return new ConfigApi(apiRoot, options);
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


