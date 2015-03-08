Container = require '../lib/index'
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
#    Container.should.have.property 'connect'
    Container.should.have.property 'registerDevice'
    Container.should.have.property 'getDevice'

  it 'should call to same singleton object', ->
    Container.registerDevice('test', {})
#    Container.getDevice('test')
#    Container.connect()
