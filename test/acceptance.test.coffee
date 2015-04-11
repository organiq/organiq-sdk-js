core = require 'organiq-core'
organiq = require '../lib'
WebSocketServer = require('ws').Server
DeviceWrapper = require '../lib/device'
ProxyWrapper = require '../lib/proxy'
EventEmitter = require('events').EventEmitter

#
# Test full stack communications.
#
# Setup:
#   `appRemote` is a core node exposed via WebSockets that serves as the
#     gateway. Because it is authoritative, all device requests go through it.
#   `app` is an SDK node (container) that connects to appRemote as its gateway.
#   `nativeDevice` is a JavaScript device exposed via the SDK's
#     app.registerDevice().
#   `proxy` is a ProxyWrapper obtained from the SDK's app.getDevice(). Because
#     appRemote is authoritative for the device, this will be a
#     WebSocketDeviceProxy that flows through appRemote.
#
# Because both the device and client are on the `app` node, yet `appRemote`
# is authoritative, every device request will do a full round-trip over the
# websocket channel.
#
# The tests are therefore exercising the entire device communication path
# between an SDK client and the actual implementation object. This includes
# the SDK's DeviceWrapper and ProxyWrapper classes, as well as the core's
# WebSocketDeviceProxy and LocalDeviceProxy objects (the latter running only on
# appRemote).
#
describe 'SDK Network Round Trip', ->
  app = null            # 'local' SDK node
  appRemote = null      # 'remote' gateway node
  wss = null            # WebSocket server for appRemote
  proxy = null          # ProxyWrapper returned from app.getDevice()
  nativeDevice = null   # JavaScript device exposed via app.registerDevice()

  beforeEach ->
    # Set up the 'remote' gateway
    appRemote = core()
    wss = new WebSocketServer({ port: 1234 })
    wss.on('connection', appRemote.websocketApi())

    # Native JavaScript device object to be exposed
    nativeDevice =
      f: (x) -> { got: x }        # function
      s: 'string-value'           # string property
      n: 42                       # number property
      b: true                     # boolean property
      events: ['e1', 'e2']        # custom events
      __emitter: new EventEmitter()
      on: (ev, fn) -> @__emitter.on ev, fn
      emit: () -> @__emitter.emit.apply @__emitter, arguments

    # Local SDK container.
    app = organiq { apiRoot: 'ws://localhost:1234' }
    app.registerDevice 'my-device-id', nativeDevice
    p = app.getDevice 'my-device-id'
    return p.then (proxy_) ->
      proxy = proxy_

  afterEach ->
    wss.close()
    wss = app = appRemote = null


  describe 'ProxyWrapper', ->
    it 'should exist', ->
      proxy.should.exist

    it 'get method fetches remote values', ->
      p = proxy.get 's'
      return p.then (res) ->
        res.should.equal 'string-value'

    it 'get method caches returned value', ->
      p = proxy.get 's'
      return p.then () ->
        proxy.s.should.equal 'string-value'   # should be stored in cache

    it 'sync() gets all properties', ->
      p = proxy.sync()
      return p.then () ->
        proxy.n.should.equal 42
        proxy.b.should.equal true
        proxy.s.should.equal 'string-value'

    it 'setter optimistically sets value', ->
      proxy.n = 666               # invoke DeviceWrapper.set()
      proxy.n.should.equal 666    # value should immediately be set
      return proxy.sync().then ->
        proxy.n.should.equal 666  # still set

    it 'set method optimistically sets value', ->
      proxy.set 'n', 667
      proxy.n.should.equal 667
      return proxy.sync().then ->
        proxy.n.should.equal 667  # still set

    it 'supports calling methods', ->
      p = proxy.f('hello')
      p.then (res) ->
        res.should.deep.equal { got: 'hello' }
        return res

    it 'receives events from connected device', (done) ->
      testEventValue = 'test-event-val'
      proxy.on 'e1', (val) ->
        val.should.equal testEventValue
        done()
      nativeDevice.emit 'e1', testEventValue



#
# Local Node Round Trip
#
# Similar to the above case, but in this scenario the local node IS
# authoritative for the device, so we are using LocalDeviceProxy and not
# WebSocketDeviceProxy.
#
describe 'SDK Local Round Trip', ->
  app = null            # 'local' SDK node
  proxy = null          # ProxyWrapper returned from app.getDevice()
  nativeDevice = null   # JavaScript device exposed via app.registerDevice()

  beforeEach ->
    # Native JavaScript device object to be exposed
    nativeDevice =
      f: (x) -> { got: x }        # function
      s: 'string-value'           # string property
      n: 42                       # number property
      b: true                     # boolean property
      events: ['e1', 'e2']        # custom events
      __emitter: new EventEmitter()
      on: (ev, fn) -> @__emitter.on ev, fn
      emit: () -> @__emitter.emit.apply @__emitter, arguments

    # Local node. Note that we can't use an SDK node because that requires
    # a gateway connection. Instead, we manually build the DeviceWrapper and
    # ProxyWrapper objects we need.
    app = core()
    dw = new DeviceWrapper nativeDevice
    app.register 'my-device-id', dw
    proxy_ = app.connect 'my-device-id'
    return proxy_.describe('.schema').then (schema) ->
      proxy = new ProxyWrapper schema, proxy_

  afterEach ->
    app = null

  describe 'ProxyWrapper', ->
    it 'should exist', ->
      proxy.should.exist

    it 'get method fetches remote values', ->
      p = proxy.get 's'
      return p.then (res) ->
        res.should.equal 'string-value'

    it 'get method caches returned value', ->
      p = proxy.get 's'
      return p.then () ->
        proxy.s.should.equal 'string-value'   # should be stored in cache

    it 'sync() gets all properties', ->
      p = proxy.sync()
      return p.then () ->
        proxy.n.should.equal 42
        proxy.b.should.equal true
        proxy.s.should.equal 'string-value'

    it 'setter optimistically sets value', ->
      proxy.n = 666               # invoke DeviceWrapper.set()
      proxy.n.should.equal 666    # value should immediately be set
      return proxy.sync().then ->
        proxy.n.should.equal 666  # still set

    it 'set method optimistically sets value', ->
      proxy.set 'n', 667
      proxy.n.should.equal 667
      return proxy.sync().then ->
        proxy.n.should.equal 667  # still set

    it 'supports calling methods', ->
      p = proxy.f('hello')
      p.then (res) ->
        res.should.deep.equal { got: 'hello' }
        return res

    it 'receives events from connected device', (done) ->
      testEventValue = 'test-event-val'
      proxy.on 'e1', (val) ->
        val.should.deep.equal testEventValue
        done()
      nativeDevice.emit 'e1', testEventValue





