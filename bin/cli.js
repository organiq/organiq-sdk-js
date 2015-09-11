#!/usr/bin/env node
// Copyright (c) 2015 Organiq, Inc. All Rights Reserved.

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var rest = require('restler');
var prompt = require('prompt');
var debug = require('debug')('organiq:cli');
var osenv = require('osenv');
var path = require('path');

var VERSION = require('../package.json').version;

// The default apiRoot is 'wss://api.organiq.io'. We look for an override
// in the following places:
//    `--apiRoot` command line option
//    `apiRoot` property of organiq.json in current directory
//    `apiRoot` property of .organiq in home directory
//    process.env.ORGANIQ_APIROOT
var _optionsPath = './organiq.json';
var _packageData = null;
var _globalOptionsPath = path.join(osenv.home(), '.organiq');
var _globalPackageData = null;

function writePackageData(apiRoot, dpiRoot, apiKeyId, apiKeySecret, global) {
  var optionsPath = global ? _globalOptionsPath : _optionsPath;
  var packageData = {
    'apiRoot': apiRoot,
    'dpiRoot': dpiRoot,
    'namespace': defaultNamespace
  };
  if (apiKeyId) {
    packageData['apiKeyId'] = apiKeyId;
  }
  if (apiKeySecret) {
    packageData['apiKeySecret'] = apiKeySecret;
  }
  var s = JSON.stringify(packageData, null, 4);
  fs.writeFileSync(optionsPath, s);
  if (global) { _globalPackageData = null; }
  else { _packageData = null; }
}

function readPackageData(global) {
  var packageData = global ? _globalPackageData : _packageData;
  var optionsPath = global ? _globalOptionsPath : _optionsPath;
  if (!packageData && fs.existsSync(optionsPath)) {
    var s = fs.readFileSync(optionsPath, 'utf8');
    packageData = JSON.parse(s);
  }
  return packageData || {};
}

function getApiRoot() {
  var apiRoot = argv['apiRoot'] || argv['a'];
  if (!apiRoot) { apiRoot = readPackageData()['apiRoot']; }
  if (!apiRoot) { apiRoot = process.env.ORGANIQ_APIROOT; }
  if (!apiRoot) { apiRoot = readPackageData(true)['apiRoot']; }
  if (!apiRoot) { apiRoot = 'https://api.organiq.io'; }
  return apiRoot;
}

function getDpiRoot() {
  var dpiRoot = argv['dpiRoot'] || argv['a'];
  if (!dpiRoot) { dpiRoot = readPackageData()['dpiRoot']; }
  if (!dpiRoot) { dpiRoot = process.env.ORGANIQ_DPIROOT; }
  if (!dpiRoot) { dpiRoot = readPackageData(true)['dpiRoot']; }
  if (!dpiRoot) { dpiRoot = 'wss://dpi.organiq.io'; }
  return dpiRoot;
}

function getApiKeyId() {
  var apiKeyId = argv['apiKeyId'] || argv['id'];
  if (!apiKeyId) { apiKeyId = readPackageData()['apiKeyId']; }
  if (!apiKeyId) { apiKeyId = process.env.ORGANIQ_APIKEY_ID; }
  if (!apiKeyId) { apiKeyId = readPackageData(true)['apiKeyId']; }
  if (!apiKeyId) { apiKeyId = ''; }
  return apiKeyId;
}

function getApiKeySecret() {
  var apiKeySecret = argv['apiKeySecret'] || argv['secret'];
  if (!apiKeySecret) { apiKeySecret = readPackageData()['apiKeySecret']; }
  if (!apiKeySecret) { apiKeySecret = process.env.ORGANIQ_APIKEY_SECRET; }
  if (!apiKeySecret) { apiKeySecret = readPackageData(true)['apiKeySecret']; }
  if (!apiKeySecret) { apiKeySecret = ''; }
  return apiKeySecret;
}

var apiRoot = getApiRoot();
var dpiRoot = getDpiRoot();
var apiKeyId = getApiKeyId();
var apiKeySecret = getApiKeySecret();
var defaultNamespace = '.';

function _getLocalExternalIPAddress() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ip = null;
    function _g(details) {
        if ((details.family === 'IPv4') && (!details.internal)) {
          ip = details.address;
          return false;
        }
        return true;
    }
    for (var dev in ifaces) {
      if (!ifaces.hasOwnProperty(dev)) { continue; }
      ifaces[dev].every(_g);
    }
    return ip;
}


if ( argv._.length < 1 ) {
  console.log("organiq v"+VERSION+" - Command Line Interface to Organiq");
  console.log("usage: organiq <command> [args]");
  console.log("");
  console.log("Where <command> is one of:");
  console.log("  init - create organiq.json file.");
  console.log("  register - create an Organiq user account.");
  console.log("  generate-api-key - generate an API key id and secret.");
  console.log("  get-account-info - get information about the current user.");
  console.log("  current-key      - dump current API key id and secret to stdout.");
  console.log("");
  console.log("APIROOT:       '" + apiRoot + "'");
  console.log("DPIROOT:       '" + dpiRoot + "'");
  console.log("APIKEY_ID:     " + (apiKeyId ? "'" + apiKeyId + "'" : "not set"));
  console.log("APIKEY_SECRET: " + (apiKeySecret ? "[redacted]" : "not set"));
  console.log("");
  console.log("APIXXX values are read from the following locations (in order):");
  console.log("  - command line argument (e.g., --apikeyId ABCDEF01234)");
  console.log("  - ./organiq.json setting ( {\"apiKeyId\": \"ABCDEF\" }");
  console.log("  - environment variable (e.g., ORGANIQ_APIKEY_ID=ABCDEF)");
  console.log("  - global configuration file setting");
  console.log("Global settings are read from " + _globalOptionsPath);
  process.exit(1);
}


var command = argv._[0];
switch( command ) {
  case 'init':

    var useLocalDevServer = argv['local-dev'];
    if (useLocalDevServer) {
      // find an external IPv4 address for the local host
      var ip = _getLocalExternalIPAddress();
      if (ip) {
        apiRoot = 'http://' + ip + ':8000';
        dpiRoot = 'ws://' + ip + ':1338';
        console.log('Initialized organiq.json with DPI root: ' + dpiRoot);
      } else {
        console.error('Unable to determine external IP address.');
        process.exit(1);
      }
    }

    var generateNewAccessKey = argv['generate-api-key'];
    if (generateNewAccessKey) {
      if (apiKeyId && apiKeySecret) {
        argv['email'] = apiKeyId;
        argv['password'] = apiKeySecret;
      }

      _generateApiKey(function (err, result) {
        if (err) {
          console.log('Failed to generate API key.');
          console.log(err);
          process.exit(1);
        }
        writePackageData(apiRoot, dpiRoot, result.id, result.secret);
        process.exit(1);
      });
    }

    if (!generateNewAccessKey && (!apiKeyId || !apiKeySecret)) {
      console.log("Warning! No APIKEY information found.");
      console.log("Use `organiq init --generate-api-key` to generate one.")
    }
    // case where no new key is to be generated.
    writePackageData(apiRoot, dpiRoot, apiKeyId, apiKeySecret);
    break;
  case 'register':
    _registerAccount(function(err, result) {
      if (err) { console.log('Failed to register account.'.red); console.log(err); return -1; }
      console.log('');
      console.log('Welcome, ' + result.given_name + '!');
      console.log('Check your email to activate your account.');
    });
    break;
  case 'generate-api-key':
    _generateApiKey(function(err, result) {
      if (err) { console.log('Failed to get API Key.'.red); console.log(err); return -1; }
      if (argv['global']) {
        writePackageData(
          readPackageData(true)['apiRoot'],
          readPackageData(true)['dpiRoot'],
          result.id,
          result.secret,
          true);
        console.log("API Key saved in global configuration.");
        return -1;
      }
      console.log('      API Key Id: ' + result.id);
      console.log('  API Key Secret: ' + result.secret);
    });
    break;
  case 'get-account-info':
    _getAccountInfo(function(err, result) {
      if (err) {
        console.log('Failed to get account information.'.red);
        console.log(err);
        return -1;
      }
      console.log(result);
    });
    break;
  case 'current-key':
    if (!apiKeyId || !apiKeySecret) {
      console.log('There is no active API Key.');
      return -1;
    }
    console.log(apiKeyId + ":" + apiKeySecret);
    break;
  case 'activate-device':
    _activateDevice(function(err, result) {
      if (err) {
        console.log('Failed to activate device.'.red);
        console.log(err);
        return -1;
      }
      console.log(result);
    });
    break;
  case 'get-device-id':
    _getDeviceByAlias(function(err, result) {
      if (err) {
        console.log('Failed to find device.'.red);
        console.log(err);
        return -1;
      }
      console.log(result);
    });
    break;


  default:
    console.log("Unrecognized command '%s'", command);
}


function _registerAccount(callback) {
  var schema = {
    properties: {
      givenName: {
        message: 'First (given) name',
        required: true,
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Name should contain only letters, spaces, or dashes'
      },
      surname: {
        message: 'Last (family) name',
        required: true,
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Name should contain only letters, spaces, or dashes'
      },
      email: {
        message: '     Email address',
        required: true,
        validator: /^.+@.+\..+$/,
        warning: 'Please enter a valid email address (you@example.com)'
      },
      password: {
        message: ' Choose a password',
        hidden: true
      },
      password2: {
        message: ' Re-enter password',
        hidden: true
      }
    }
  };

  prompt.message  = "organiq".white.bold;
  prompt.override = argv;

  if (argv['name']) {
    var names = argv['name'].split(' ');
    console.log('name is ' + names[0] + ' ' + names[1]);
    prompt.override['givenName'] = names[0];
    if (names.length > 1) {
      prompt.override['surname'] = names[1];
    }
  }


  prompt.get(schema, function(err, result) {
    if (result.password !== result.password2) {
      return callback(Error('Passwords do not match!'));
    }

    var data = {
      email: result.email,
      password: result.password,
      surname: result.surname,
      given_name: result.givenName,
      profile: {
        namespace: '.'
      }
    };

    rest.postJson(getApiRoot() + '/users/', data).on('complete',
      function(data, response) {
        if (data instanceof Error) {
          return callback(data);
        }
        if (response.statusCode !== 201) {
          return callback(_responseToText(data, response));
        }
        return callback(null, data);
      });
  });

}

function _generateApiKey(callback)  {
  var schema = {
    properties: {
      email: {
        message: '     Email address',
        required: true,
        validator: /^.+@.+\..+$/,
        warning: 'Please enter a valid email address (you@example.com)'
      },
      password: {
        message: '    Enter password',
        hidden: true
      }
    }
  };

  prompt.message  = "organiq".white.bold;
  prompt.override = argv;

  prompt.get(schema, function(err, result) {
    var data = {
      name: argv['keyName'] || ''
    };

    var options = {
      username: result.email,
      password: result.password
    };

      rest.postJson(getApiRoot() + '/apikeys/', data, options).on('complete',
        function(data, response) {
          if (data instanceof Error) {
            return callback(data);
          }
          if (response.statusCode !== 201) {
            callback(Error(_responseToText(data, response)));
          }
          callback(null, data);
        });
    });
  }

  function _getAccountInfo(callback)  {
    var schema = {
      properties: {
        email: {
          message: '     Email address',
          required: true,
          validator: /^.+@.+\..+$/,
          warning: 'Please enter a valid email address (you@example.com)'
        },
        password: {
          message: '    Enter password',
          hidden: true
        }
      }
    };

    prompt.message  = "organiq".white.bold;
    prompt.override = argv;

    if (apiKeyId && apiKeySecret) {
      argv['email'] = apiKeyId;
      argv['password'] = apiKeySecret;
      delete schema.properties.email.validator;
    }
    prompt.get(schema, function(err, result) {
      var options = {
        username: result.email,
        password: result.password
      };

      rest.get(getApiRoot() + '/current_user/', options).on('complete',
        function(data, response) {
          if (data instanceof Error) {
            return callback(data);
          }
          if (response.statusCode !== 200) {
            return callback(Error(_responseToText(data, response)))
          }
          callback(null, data);
        });
    });
  }

  function _activateDevice(callback)  {
    var schema = {
      properties: {
        alias: {
          message: 'Device alias',
          required: true
        }
      }
    };

    prompt.message  = "organiq".white.bold;
    prompt.override = argv;

    prompt.get(schema, function(err, result) {
      var options = {
        username: apiKeyId,
        password: apiKeySecret
      };

      var data = {
        alias: result.alias,
        class_id: "",
        version: "0.0.0"
      };
      rest.postJson(getApiRoot() + '/devices/', data, options).on('complete',
      function(data, response) {
        if (data instanceof Error) {
          return callback(data);
        }
        if (response.statusCode !== 200) {
          return callback(Error(_responseToText(data, response)))
        }
        callback(null, data);
      });
  });
}

function _getDeviceByAlias(callback)  {
  var schema = {
    properties: {
      alias: {
        message: 'Device alias (friendly name)',
        required: true
      }
    }
  };

  prompt.message  = "organiq".white.bold;
  prompt.override = argv;

  prompt.get(schema, function(err, result) {
    var options = {
      username: apiKeyId,
      password: apiKeySecret
    };

    rest.get(getApiRoot() + '/devices/?alias=' + result.alias, options).on('complete',
      function(data, response) {
        if (data instanceof Error) {
          return callback(data);
        }
        if (response.statusCode !== 200) {
          return callback(Error(_responseToText(data, response)))
        }
        if (data.length < 1) {
          return callback(Error('Not Found'));
        }

        // we get back an array with exactly one element (alias is unique for
        // a user account)
        callback(null, data[0]['device_id']);
      });
  });
}

function _responseToText(data, response) {
  if (response.statusCode == 200) {
    return "OK";
  }
  if (response.statusCode === 400) {
    if (typeof data['email'] !== 'undefined') {
      if (/This field must be unique/.test(data.email[0])) {
        return 'An account with the supplied email already exists.';
      }
    }
    else if (typeof data['non_field_errors'] !== 'undefined') {
      if (/The fields user, alias must make a unique set\./.test(data.non_field_errors[0])) {
        return 'A device with the provided alias already exists.';
      }
    }
  }
  var detail = response.statusCode == 500 ? 'Internal Server Error' : JSON.stringify(data);
  return response.statusCode + ' (' + response.statusMessage + '): ' + detail;
}
