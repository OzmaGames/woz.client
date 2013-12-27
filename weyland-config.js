exports.config = function (weyland) {
  weyland.build('main')
      .task.jshint({
        include: 'app/**/*.js'
      })
      .task.uglifyjs({
        include: ['app/**/*.js', 'lib/durandal/**/*.js']
      })
      .task.rjs({
        include: ['app/**/*.{js,html}', 'lib/durandal/**/*.js'],
        loaderPluginExtensionMaps: {
          '.html': 'text'
        },
        rjs: {
          name: '../lib/almond-custom', //to deploy with require.js, use the build's name here instead
          insertRequire: ['main'], //not needed for require
          baseUrl: 'app',
          wrap: true, //not needed for require
          paths: {
             'text':     '../lib/requirejs-text/text',
             'durandal': '../lib/durandal',
             'plugins':  '../lib/durandal/plugins',
             'transitions': '../lib/durandal/transitions',
             'crypto.sha3': '../lib/crypto.sha3',
             'facebook': '//connect.facebook.net/en_US/all',
             'knockout': 'empty:',
             'socket': 'empty:',
             'jquery': 'empty:',
             'paper': 'empty:'
          },
          shim: {
             'facebook': {
                'export': 'FB'
             }
          },
          inlineText: true,
          optimize: 'none',
          pragmas: {
            build: true
          },
          stubModules: ['text'],
          keepBuildDir: true,
          out: 'build/main-built.js'
        }
      });
}