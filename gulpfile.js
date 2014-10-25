var gulp = require('gulp');
var durandal = require('gulp-durandal');

gulp.task('durandal', function () {
    durandal()
       .pipe(gulp.dest('/buildgulp'));
});