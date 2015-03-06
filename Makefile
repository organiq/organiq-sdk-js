##
## npm install -g browserify
##

all: tessel-bundle browserify

tessel-bundle:
	cp ./lib/*.js ./package-tessel/

browserify:
	browserify -r ./lib/index.js:organiq -o build/organiq.js

