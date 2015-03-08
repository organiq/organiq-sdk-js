core = require 'organiq-core'
organiq = require '../lib'
WebSocketServer = require('ws').Server
Device = require '../lib/device'

describe 'Full API Round trip', ->
  app = null
  appRemote = null
  wss = null
  proxy = null

  beforeEach ->
    # Set up the 'remote' gateway
    appRemote = core()
    wss = new WebSocketServer({ port: 1234 })
    wss.on('connection', appRemote.websocketApi())

    nativeDevice =
      f: (x) -> { got: x }
      s: 'string-value'
      n: 42
      b: true
      _events: ['e1', 'e2']

    app = organiq { apiRoot: 'ws://localhost:1234' }
    app.registerDevice 'my-device-id', nativeDevice
    p = app.getDevice 'my-device-id'
    return p.then (proxy_) ->
      proxy = proxy_

  afterEach ->
    wss.close()
    wss = app = appRemote = null

  it 'gets device proxy', ->
    proxy.should.exist

  it 'sync() gets all properties', ->
    p = proxy.sync()
    return p.then () ->
      proxy.n.should.equal 42
      proxy.b.should.equal true
      proxy.s.should.equal 'string-value'

  it 'should optimistically set properties using setter', ->
    proxy.n = 666
    proxy.n.should.equal 666

  it 'should optimistically set properties using set()', ->
    proxy.set 'n', 667
    proxy.n.should.equal 667

  it 'supports calling methods', ->
    p = proxy.f('hello')
    p.then (res) ->
      res.should.deep.equal { got: 'hello' }
      return res


describe 'Accessing DeviceWrapper through Device Stack', ->
  testDevice = null
  testDeviceId = 'test-device-id-localdevice'
  app = null
  proxy = null

  expectedGetValue = 'i am the get value'
  expectedSetValue = true
  expectedMethodValue = { ret: 'a method value' }

  beforeEach ->
    app = new core()
    testDevice =
      prop: expectedGetValue
      f1: (x) -> return { got: x }
      f2: (x,y,z) -> return { got: [x,y,z] }
    ld = new Device(testDevice)
    app.register testDeviceId, ld
    proxy = app.connect testDeviceId

  it 'gets proxy for locally-registered device', ->
    proxy.should.be.instanceof core._LocalDeviceProxy

  it 'property get works via proxy', ->
    res = proxy.get('prop')
    return res.then (res) ->
      res.should.equal expectedGetValue

  it 'property set works via proxy', ->
    res = proxy.set 'prop', 'newval'
    return res.then (res) ->
      res.should.equal expectedSetValue
      res = proxy.get 'prop'
      return res.then (res) ->
        res.should.equal 'newval'

  it 'invokes method via proxy', ->
    res = proxy.invoke 'f1', 'hi!'
    return res.then (res) ->
      res.should.deep.equal { got: 'hi!' }

  it 'invokes method with params via proxy', ->
    res = proxy.invoke 'f2', ['hello', 'world', '!']
    return res.then (res) ->
      res.should.deep.equal { got: ['hello', 'world', '!'] }



