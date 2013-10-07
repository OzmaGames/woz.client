exports.config = function(weyland) {
    weyland.build('main')
        .task.jshint({
            include:'app/**/*.js'
        })
        .task.uglifyjs({
            include:['app/**/*.js', 'lib/durandal/**/*.js']
        })
        .task.rjs({
            include:['app/**/*.{js,html}', 'lib/durandal/**/*.js'],
            loaderPluginExtensionMaps:{
                '.html':'text'
            },
            rjs:{
                name:'../lib/almond-custom', //to deploy with require.js, use the build's name here instead
                insertRequire:['main'], //not needed for require
                baseUrl : 'app',
                wrap:true, //not needed for require
                paths : {
                    'text': '../lib/requirejs-text/text',
                    'durandal': '../lib/durandal/',
                    'plugins': '../lib/durandal/plugins',
                    'transitions': '../lib/durandal/transitions',
                    'paper': '../lib/paper/paper',
                    'socket': '../lib/socket.io.min',
                    'crypto.sha3': '../lib/crypto.sha3',
                    'transitions/slidedown': 'api/transitions/slidedown',
                    'knockout': 'empty:',
                    'jquery': 'empty:'
                },
                inlineText: true,
                optimize : 'none',
                pragmas: {
                    build: true
                },
                stubModules : ['text'],
                keepBuildDir: true,
                out:'app/main-built.js'
            }
        });
}