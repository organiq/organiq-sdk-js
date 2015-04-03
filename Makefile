##
## npm install -g browserify
##

all: tessel browserify

tessel:
	rm ./package-tessel/*.js
	cp ./lib/*.js ./package-tessel/
	cp ./README.md ./package-tessel/

browserify:
	browserify -r ./lib/index.js:organiq -o build/organiq.js

