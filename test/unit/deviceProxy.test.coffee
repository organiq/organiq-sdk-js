RemoteDeviceProxy = require('../../lib/clientContainer').RemoteDeviceProxy
OrganiqRequest = require('../../lib/clientContainer').OrganiqRequest
when_ = require 'when'

#
# RemoteDeviceProxy unit tests
#
# We create a RemoteDeviceProxy with organiq.connect() and verify that the
# interface interacts with gateway.dispatch() as expected.
#
describe 'RemoteDeviceProxy', ->
  testDeviceId = '.:test-device-id'
  req = OrganiqRequest
  proxy = null
  spy = null
  beforeEach ->
    gateway =
      dispatch: (req) -> when_(true)
    spy = sinon.spy gateway, 'dispatch'
    proxy = RemoteDeviceProxy(gateway, testDeviceId)

  it 'should send `get` request', ->
    proxy.get 'test'
    spy.should.have.been.calledWith(OrganiqRequest.get(testDeviceId, 'test'));

  it 'should send `set` request', ->
    proxy.set 'test', { val: 'someval' }
    spy.should.have.been.calledWith( OrganiqRequest.set(testDeviceId, 'test', { val: 'someval' }) )

  it 'should send `invoke` request', ->
    proxy.invoke 'test', ['1', '2']
    spy.should.have.been.calledWith( OrganiqRequest.invoke(testDeviceId, 'test', ['1', '2']) )

  it 'should send `config` request', ->
    proxy.config 'unused', { setting: 'value' }
    spy.should.have.been.calledWith( OrganiqRequest.config(testDeviceId, 'unused', { setting: 'value' } ) )

  it 'should send `subscribe` request', ->
    proxy.subscribe 'test'
    spy.should.have.been.calledWith( OrganiqRequest.subscribe(testDeviceId, 'test') )

  it 'should send `describe` request', ->
    proxy.describe 'test'
    spy.should.have.been.calledWith( OrganiqRequest.describe(testDeviceId, 'test') )

  # 'notify' and 'put' are actually emitted by the ClientContainer
#  it 'should implement `notify` event', (done) ->
#    proxy.on 'notify', (id, params) ->
#      id.should.equal 'test-event'
#      params.should.deep.equal { test: 'args' }
#      done()
#    req = OrganiqRequest.notify testDeviceId, 'test-event', { test: 'args' }
#    app.__dispatch req
#
#  it 'should implement `put` event', (done) ->
#    proxy.on 'put', (id, value) ->
#      id.should.equal 'test-metric'
#      value.should.deep.equal { test: 'value' }
#      done()
#    req = OrganiqRequest.put testDeviceId, 'test-metric', { test: 'value' }
#    app.__dispatch req

