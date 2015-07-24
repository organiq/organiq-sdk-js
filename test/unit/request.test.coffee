OrganiqRequest = require '../../lib/request'

describe 'OrganiqRequest', ->
  testDeviceId = 'test-device-id'

  describe 'contructor', ->
    it 'should return an instance of OrganiqRequest', ->
      req = new OrganiqRequest()
      req.should.be.an.instanceof OrganiqRequest

    it 'should return an instance of OrganiqRequest when invoked without `new`', ->
      req = OrganiqRequest()
      req.should.be.an.instanceof OrganiqRequest

    it 'should accept deviceid', ->
      req = OrganiqRequest testDeviceId
      req.deviceid.should.equal testDeviceId

    it 'should accept deviceid and method', ->
      req = OrganiqRequest testDeviceId, 'PUT'
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'PUT'

  describe 'factory functions', ->
    testDeviceId = 'test-device-3'
    testPropertyName = 'test-prop-name'
    testMethodName = 'test-method-name'
    testEventName = 'test-event-name'
    testValue = { someProp: 'someValue' }
    testParams = [ apple: 'red', banana: 'yellow' ]

    it 'should create valid GET request', ->
      req = OrganiqRequest.get testDeviceId, testPropertyName
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'GET'
      req.identifier.should.equal testPropertyName

    it 'should create valid SET request', ->
      req = OrganiqRequest.set testDeviceId, testPropertyName, testValue
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'SET'
      req.identifier.should.equal testPropertyName
      req.value.should.equal testValue

    it 'should create valid INVOKE request', ->
      req = OrganiqRequest.invoke testDeviceId, testMethodName, testParams
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'INVOKE'
      req.identifier.should.equal testMethodName

    it 'should create valid CONFIG request', ->
      req = OrganiqRequest.config testDeviceId, testPropertyName,testValue
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'CONFIG'
      req.identifier.should.equal testPropertyName
      req.value.should.equal testValue

    it 'should create valid SUBSCRIBE request', ->
      req = OrganiqRequest.subscribe testDeviceId, testEventName
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'SUBSCRIBE'
      req.identifier.should.equal testEventName

    it 'should create valid DESCRIBE request', ->
      req = OrganiqRequest.describe testDeviceId, testPropertyName
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'DESCRIBE'
      req.identifier.should.equal testPropertyName

    it 'should create valid PUT request', ->
      req = OrganiqRequest.put testDeviceId, testPropertyName, testValue
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'PUT'
      req.identifier.should.equal testPropertyName
      req.value.should.equal testValue

    it 'should create valid NOTIFY request', ->
      req = OrganiqRequest.notify testDeviceId, testMethodName, testParams # event
      req.deviceid.should.equal testDeviceId
      req.method.should.equal 'NOTIFY'
      req.identifier.should.equal testMethodName
      req.params.should.equal testParams

  describe 'methods', ->
    testDeviceId = 'test-device-id-2'
    deviceMethods = ['NOTIFY', 'PUT']
    applicationMethods = ['GET', 'SET', 'INVOKE', 'SUBSCRIBE', 'CONFIG', 'DESCRIBE']
    invalidMethods = ['NOTVALID', 'BADMETHOD', '']

    it 'isDeviceOriginated & isApplicationOriented should behave correctly', ->
      for method in applicationMethods
        req = OrganiqRequest testDeviceId, method
        req.isApplicationOriginated().should.be.true
        req.isDeviceOriginated().should.be.false
      for method in deviceMethods
        req = OrganiqRequest testDeviceId, method
        req.isApplicationOriginated().should.be.false
        req.isDeviceOriginated().should.be.true
      for method in invalidMethods
        req = OrganiqRequest testDeviceId, method
        req.isApplicationOriginated().should.be.false
        req.isDeviceOriginated().should.be.false


