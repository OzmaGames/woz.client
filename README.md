## Prerequisites
install nodeJS, then:

```
npm install -g gulp
# you may need sudo rights to run this command

npm install
```


## to run and debug the game

```
# runs the task that is defined as 'serve' in the ./gulpfile.js
gulp serve
```

every time you change a less/html/js file, the page will be refreshed.

## DEBUG

to change the server url change the following file:
`play/app/api/server/connection.js`

## Production more efficient

```
# export the package to the ./dist/static/play
gulp phonegap
```

zip the above folder
TODO: you can integrate ziping in gulp as well.

to serve the phonegap folder do the following

```
gulp phonegap:serve
```

## Production

### GAME main.js
```
# this create a minified and compiled main.js file for production use in phonegap
# the destination is at ./dist/play
gulp almond-play
```

copy the main.js to the static/play/ folder

### statics files
```
# copies all necessary static files such as sounds and images to the
# ./dist/static folder
gulp statics-almond
```

#### index.html

copy the index.html from .extra/dev/play/index.html
to dist/static/play


### Package the game for PhoneGap - keep packaging
Do the steps in [production section](production).

after your changes to any js/html files, just do the [GAME main.js section](game_main.js)

copy config.xml (perhaps take a look at the recent changes of phoneGap) to the same directory

zip everything in dist/static/play folder
