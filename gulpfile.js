var gulp = require('gulp'),
    rename = require('gulp-rename'),
    htmlReplace = require('gulp-html-replace'),
    durandal = require('gulp-durandal');

var dest = '/dist', destAlmond = './dist';
var less = require('gulp-less');
var path = require('path');

var browserSync = require('browser-sync').create();

gulp.task('less', function () {
  return gulp.src('./play/css/all.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./play/css/dist/'))
    .pipe(browserSync.stream());
});

gulp.task('default', ['less'], function() {
  gulp.watch('./play/**/*.less', ['less']);
});

gulp.task('serve', ['less'], function() {

    browserSync.init({
        server: "./play"
    });

    gulp.watch("./play/**/*.less", ['less']);
    gulp.watch("./play/**/*.html").on('change', browserSync.reload);
    gulp.watch("./play/**/*.js").on('change', browserSync.reload);
});



gulp.task('statics', function () {
    return gulp.src(['**/*.png', '**/*.jpg', '**/*.css', '**/*.ttf', '**/*.woff', 'index.html', '**/require.js'])
        .pipe(gulp.dest(dest));
});

gulp.task('durandal', function () {
    durandal({ minify: true })
       .pipe(gulp.dest(dest));
});

gulp.task('durandal-almond', function () {
    return durandal({
        main: 'config.js',
        almond: true, minify: true
    })
    .on('error', function (err) {
        console.error('error. ' + err);
    })
    .pipe(gulp.dest('./dist'));
});

gulp.task('durandal-almond-play', function () {
    return durandal({
        baseDir: 'play/app',
        almond: true, minify: true
    })
    .on('error', function (err) {
        console.error('error. ' + err);
    })
    .pipe(gulp.dest('./dist/play'));
});


gulp.task('index-almond', function () {
    return gulp.src('index.html')
        //.pipe(htmlReplace('js', 'main.js'))
        .pipe(gulp.dest(destAlmond));
});

gulp.task('statics-almond', function () {
    return gulp.src(['**/*.png', '**/*.jpg', '**/*.css', '**/*.ttf', '**/*.woff', '**/*.mp3', '**/*.ogg'])
        .pipe(gulp.dest(destAlmond + '/static'));
});

gulp.task('phonegap', ['statics-almond', 'almond-play'], function(){
    gulp.src('./dist/play/main.js')
        .pipe(gulp.dest(destAlmond + '/static/play'))
    
    gulp.src('./play/lib.min.js')
        .pipe(gulp.dest(destAlmond + '/static/play'))
    
    return gulp.src('./.extra/dev/play/index.html')
        .pipe(gulp.dest(destAlmond + '/static/play'));
});

gulp.task('phonegap:serve', ['phonegap'], function() {
    browserSync.init({
        server: destAlmond + '/static/play'
    });
});

gulp.task('build', ['statics', 'durandal']);

gulp.task('almond', ['durandal-almond', 'durandal-almond-play']);

gulp.task('almond-play', ['durandal-almond-play']);

gulp.task('almond-main', ['durandal-almond']);