WebSocket = require 'ws'
WebSocketServer = WebSocket.Server
when_ = require 'when'

WebSocketTransport = require '../../../lib/webSocketTransport'

describe 'WebSocketAPI module', ->
  it 'should return WebSocketTransport', ->
    transport = WebSocketTransport()
    transport.should.be.instanceOf WebSocketTransport

  describe 'webSocketApiConnectionHandler', ->
    mock_app = null
    mock_ws = null
    handler = null
    messageFn = null
    closeFn = null
    errorFn = null
    transport = null
    handler = null
    upstream =
      dispatch: (req) -> when_(true)
    downstream =
      dispatch: (req) -> when_(true)
    beforeEach ->
      mock_ws =
        on: (msg, fn) ->
          if msg == 'message' then messageFn = fn
          else if msg == 'close' then closeFn = fn
          else if msg == 'error' then errorFn = fn
        send: (s) ->
      transport = WebSocketTransport downstream, upstream
      handler = transport.connectionHandler

    it 'should register proper event handlers', ->
      spy = sinon.spy(mock_ws, 'on')
      handler mock_ws

      spy.should.have.been.calledWith 'message'
      spy.should.have.been.calledWith 'close'
      spy.should.have.been.calledWith 'error'

    it 'should reject binary messages', ->
      handler(mock_ws)

      fn = messageFn.bind mock_ws, {}, { binary: true }
      fn.should.throw(/Invalid.*binary/)

    it 'should reject invalid methods', ->
      handler(mock_ws)

      message = JSON.stringify { method: 'INVALID'}
      fn = messageFn.bind mock_ws, message, {}
      fn.should.throw(/Invalid.*method/)

      message = JSON.stringify { method: 'GET0'}
      fn = messageFn.bind mock_ws, message, {}
      fn.should.throw(/Invalid.*method/)

      message = JSON.stringify { method: 'AINVOKE'}
      fn = messageFn.bind mock_ws, message, {}
      fn.should.throw(/Invalid.*method/)

    it 'should reject invalid JSON', ->
      handler(mock_ws)

      message = "{ i: am not JSON }"
      fn = messageFn.bind mock_ws, message, {}
      fn.should.throw(/Invalid.*message/)
