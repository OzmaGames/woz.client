var gulp = require('gulp'),
    rename = require('gulp-rename'),
    htmlReplace = require('gulp-html-replace'),
    durandal = require('gulp-durandal');

var dest = '/dist', destAlmond = '../dist';

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
        .pipe(gulp.dest(destAlmond));
});

gulp.task('build', ['statics', 'durandal']);

gulp.task('almond', ['durandal-almond', 'durandal-almond-play']);

gulp.task('almond-play', ['durandal-almond-play']);

gulp.task('almond-main', ['durandal-almond']);