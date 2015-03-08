global.chai = require 'chai'
global.sinon = require 'sinon'
global.sinonChai = require 'sinon-chai'
global.chai.should()
global.chai.use(sinonChai)

global.when_ = require 'when'

