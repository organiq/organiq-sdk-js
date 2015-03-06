#!/usr/bin/env node
// Copyright (c) 2014 Myk Willis & Company, LLC. All Rights Reserved.

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var Router = require('./router.js')

var VERSION = require('../package.json').version;

// The default apiRoot is 'http://api.organiq.io'. We look for an override
// in the following places:
//    `--apiRoot` command line option
//    `apiRoot` property of organiq.json in current directory
//    process.env.ORGANIQ_APIROOT
var optionsPath = './organiq.json';

var _packageData = null;
function writePackageData(apiRoot) {
  var packageData = {
    'apiRoot': apiRoot
  };
  var s = JSON.stringify(packageData, null, 4);
  fs.writeFileSync(optionsPath, s);
  _packageData = null;
}
function readPackageData() {
  if (!_packageData && fs.existsSync(optionsPath)) {
    var s = fs.readFileSync(optionsPath, 'utf8');
    _packageData = JSON.parse(s);
  }
  return _packageData || {};
}

function getApiRoot() {
  var apiRoot = argv['apiRoot'] || argv['a'];
  if (!apiRoot) { apiRoot = readPackageData()['apiRoot']; }
  if (!apiRoot) { apiRoot = process.env.ORGANIQ_APIROOT; }
  if (!apiRoot) { apiRoot = 'http://api.organiq.io'; }
  return apiRoot;
}

var apiRoot = getApiRoot();

function _getLocalExternalIPAddress() {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ip;
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

if ( process.argv[0] === 'node' ) {
  process.argv.shift();
}

if ( process.argv.length < 2 ) {
  console.log("organiq v"+VERSION+" - Command Line Interface to Organiq");
  console.log("usage: organiq <command> [args]");
  console.log("");
  console.log("Where <command> is one of:");
  console.log("  init - create organiq.json file.");
  console.log("  server - configure local test server. See `iq server help`");
  console.log("API Root is currently: '" + apiRoot + "'");
  console.log("(Override with --apiRoot argument, 'apiRoot' in organiq.json,");
  console.log(" or ORGANIQ_APIROOT environment variable.");
  process.exit(1);
}


var command = process.argv[1];
switch( command ) {
  case 'init':
    var useLocalDevServer = argv['local-dev'];
    if (useLocalDevServer) {
      // find an external IPv4 address for the local host
      var ip = _getLocalExternalIPAddress();
      if (ip) {
        apiRoot = 'http://' + ip + ':1340';
        console.log('Initialized organiq.json with API root: ' + apiRoot);
      } else {
        console.error('Unable to determine external IP address. Use --api-root to specify it explicitly.');
        process.exit(1);
      }
    }
    writePackageData(apiRoot);
    break;
  case 'server':
    if (process.argv.length < 3) {
      console.log("'server' requires subcommand.");
      return;
    }
    var subcommand = process.argv[2];
    switch(subcommand) {
      case 'start':
        var port = argv['port'] || 1340;
        var router = new Router({ port: port });
        console.log("Organiq development server v"+VERSION+" started on port " + port);
        break;

      case 'help':
        console.log("Usage: organiq server <command> [args]");
        console.log("Where <command> is one of:");
        console.log("  start --port <port>");
        break;
    }
    break;
  default:
    console.log("Unrecognized command '%s'", command);
}
