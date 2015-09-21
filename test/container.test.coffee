rewire = require 'rewire'
Container = rewire '../lib/index'
util = require('util')
EventEmitter = require('events').EventEmitter

describe 'OrganiqContainer constructor', ->

  it 'should always invoke as constructor', ->
    ld = new Container {autoConnect: false}
    ld.should.be.an.instanceof Container

    # call as function (not as constructor)
    ld = Container {autoConnect: false}
    ld.should.be.an.instanceof Container

describe 'Singleton behavior', ->
  it 'should have API methods', ->
    Container.should.have.property 'registerDevice'
    Container.should.have.property 'getDevice'
    Container.should.have.property 'installDriver'

describe 'registerDevice', ->
  it 'should pass calls without schema by default', ->
    ld = new Container { autoConnect: false }
    d =
      foo: ->
    (->ld.registerDevice('test', d)).should.not.throw()

  it 'should pass calls without schema when strictSchema disabled', ->
    ld = new Container { autoConnect: false, strictSchema: false }
    d =
      foo: ->
    (->ld.registerDevice('test', d)).should.not.throw()

  it 'should reject calls without schema when strictSchema enabled', ->
    ld = new Container { autoConnect: false, strictSchema: true }
    d =
      foo: ->
    (->ld.registerDevice('test', d)).should.throw(/Schema is required/)

  it 'should pass strictSchema to DeviceWrapper constructor', ->
    # This rewire library is handy for stubbing out local variables in a module,
    # but it's dangerous b/c you have to be sure to clean up when done.
    Device = require '../lib/deviceWrapper.js'
    spy = sinon.spy Device
    revert = Container.__set__ 'Device', spy

    try
      ld = new Container { autoConnect: false, strictSchema: true }
      d =
        foo: ->
      ld.registerDevice 'test', d, {}
    finally
      revert()

    spy.should.have.been.calledOnce
    spy.args[0][2].should.deep.equal { strictSchema: true }


