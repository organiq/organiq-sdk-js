##
## npm install -g browserify
##

all: tessel-bundle browserify

tessel-bundle:
	cp ./src/*.js ./package-tessel/

browserify:
	browserify -r ./src/index.js:organiq -o build/organiq.js

