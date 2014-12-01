/*jslint node: true*/
/*jshint -W030 */ // "Expected an assignment or function call and instead saw an expression"
var Schema = require('../src/schema.js');

describe('Schema', function() {
  beforeEach(function(done) {
    done();
  });

  it('should initialize with attributes', function() {
    Schema.should.be.ok;
    var attr = {
      properties: { prop: String },
      methods: { method: String },
      events: { event: String }
    };
    var schema = new Schema(attr);
    schema.should.be.instanceof(Schema);
    schema.should.have.properties('properties', 'methods', 'events');
  });

});

describe('Schema creation from object definition', function() {
  it('should return instance of Schema', function() {
    var schema = Schema.fromObjectDefinition({});
    schema.should.be.ok;
    schema.should.be.instanceof(Schema);
  });

  it('should detect properties and methods', function() {
    var obj = {
      prop: 'value',
      meth: function() {}
    };
    var schema = Schema.fromObjectDefinition(obj);
    schema.should.be.instanceof(Schema);
    schema.properties.should.have.properties('prop');
    schema.methods.should.have.properties('meth');
  });

  it('should detect getter properties', function() {
    var obj = {
      get prop() { return 1; }
    };
    var schema = Schema.fromObjectDefinition(obj);
    schema.properties.should.have.property('prop');
  });

  var when = require('when');
  it('should detect async getter properties', function() {
    var obj = {
      get prop() { var d = when.defer(); d.resolve(1); return d.promise; }
    };
    var schema = Schema.fromObjectDefinition(obj);
    schema.properties.should.have.property('prop');
  });

  it('should detect enumerated events', function() {
    var obj = {
      events: ['e1', 'e2', 'e3']
    };
    var schema = Schema.fromObjectDefinition(obj);
    schema.events.should.have.properties('e1', 'e2', 'e3');
   });
});

describe('Schema creation getter detection', function() {
  it('should detect number type', function() {
    var obj = {
      get prop() { return 1; }
    };
    var schema = Schema.fromObjectDefinition(obj);
    schema.properties.should.have.property('prop');
    schema.properties.prop.should.have.property('type');
    schema.properties.prop.type.should.equal('number');
  });
});

