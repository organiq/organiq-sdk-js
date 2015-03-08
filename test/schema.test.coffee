Schema = require '../lib/schema'
util = require('util')
EventEmitter = require('events').EventEmitter

describe 'schema generation', ->
  testDevice = null
  schema = null

  beforeEach ->
    testDevice =
      numberProp: 42
      stringProp: 'stringValue'
      booleanProp: true
      f: (x) -> return { got: x, said: 'smash' }
      events: ['swoosh']
      __emitter: new EventEmitter
      on: (ev, fn) -> return this.__emitter.on(ev,fn)

    schema = Schema.fromObjectDefinition testDevice

  it 'maps number properties', ->
    schema.properties.should.have.property 'numberProp'
    schema.properties['numberProp'].type.should.equal 'number'

  it 'maps string properties', ->
    schema.properties.should.have.property 'stringProp'
    schema.properties['stringProp'].type.should.equal 'string'

  it 'maps boolean properties', ->
    schema.properties.should.have.property 'booleanProp'
    schema.properties['booleanProp'].type.should.equal 'boolean'

  it 'maps functions', ->
    schema.methods.should.have.property 'f'
    schema.methods['f'].type.should.equal 'unknown'

  it 'maps explicit events', ->
    schema.events.should.have.property 'swoosh'

