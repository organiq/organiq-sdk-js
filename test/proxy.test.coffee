ProxyWrapper = require '../lib/proxy'
util = require('util')
EventEmitter = require('events').EventEmitter

describe 'ProxyWrapper module', ->

  describe 'constructor', ->
    mockLocalDeviceProxy = null
    testSchema = null
    proxy = null

    beforeEach ->
      mockLocalDeviceProxy =
        get: ->
        set: ->
        invoke: ->
        describe: ->
        config: ->
        __emitter: new EventEmitter
        on: (ev, fn) -> return this.__emitter.on(ev,fn)

      testSchema =
        properties: {
          'numberProp': { type: 'number', constructor: Number },
          'stringProp': { type: 'string', constructor: String },
          'booleanProp': { type: 'boolean', constructor: Boolean }
        }
        methods: {
          'f': { type: 'unknown' }
        }
        events: {
          'swoosh': {}
        }
      proxy = new ProxyWrapper testSchema, mockLocalDeviceProxy

    it 'should always invoke as constructor', ->
      pw = new ProxyWrapper testSchema, mockLocalDeviceProxy
      pw.should.be.an.instanceof ProxyWrapper

      # call as function (not as constructor)
      pw = ProxyWrapper testSchema, mockLocalDeviceProxy
      pw.should.be.an.instanceof ProxyWrapper

    it 'should create methods from schema', ->
      proxy.should.contain.f
      (typeof proxy.f).should.equal 'function'

    it 'should create properties from schema', ->
      proxy.should.contain.numberProp
      proxy.should.contain.stringProp
      proxy.should.contain.booleanProp

    it 'should publish events from schema', ->
      proxy.on 'swoosh', ->
        done()
      mockLocalDeviceProxy.__emitter.emit('notify', 'swoosh', [])

