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
