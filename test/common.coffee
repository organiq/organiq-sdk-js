global.chai = require 'chai'
global.sinon = require 'sinon'
global.sinonChai = require 'sinon-chai'
global.chaiAsPromised = require 'chai-as-promised'
global.chai.should()
global.chai.use(sinonChai)
global.chai.use(chaiAsPromised)

global.when_ = require 'when'

