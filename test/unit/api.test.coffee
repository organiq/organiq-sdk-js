Organiq = require '../../lib/deviceContainer'
EventEmitter = require('events').EventEmitter

describe 'Organiq', ->
  testDeviceId = 'example.com:test-device-id'
  # @type {Organiq}
  o = null
  beforeEach ->
    o = new Organiq()

  describe 'constructor', ->
    it 'should return an instance of Organiq', ->
      req = new Organiq()
      req.should.be.an.instanceof Organiq

    it 'should return an instance of Organiq when invoked without `new`', ->
      req = Organiq()
      req.should.be.an.instanceof Organiq

  describe 'register', ->
    it 'registers `notify` and `put` handlers on EventEmitter devices', ->
      d = new EventEmitter()
      o.register 'test-device-id', d
      d.listeners('notify').should.have.length.above 0
      d.listeners('put').should.have.length.above 0

    it 'registers `notify` and `put` handlers on non-EventEmitter devices with `on`', ->
      d =
        on: (ev, fn) ->
      spy = sinon.spy d, 'on'
      o.register 'test-device-id', d
      spy.should.have.been.calledWith 'notify'
      spy.should.have.been.calledWith 'put'

  describe 'deregister', ->
    it 'should throw for unregistered device', ->
      (->o.deregister(testDeviceId)).should.throw(Error)

