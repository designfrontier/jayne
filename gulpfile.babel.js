import babelRegister from 'babel/register';
import gulp from 'gulp';
import mocha from 'gulp-mocha';
import sourceMaps from 'gulp-sourcemaps';
import karma from 'karma';
import gutil from 'gulp-util';
import babelify from 'babelify';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import streamify from 'gulp-streamify';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import jshint from 'gulp-jshint';


gulp.task('test', function(done){
    return karma.server.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

gulp.task('dev', ['build'], () => {
    gulp.watch(['**/*.js', '!app.js', '!**/*_test.js', '!gulpfile.js'], ['build']);
});

//TODO: make this bundle up the dependencies as well as the library itself.
gulp.task('build', () => {
    let bundler = browserify({ debug: true }),
        b;

    bundler.transform(babelify);
    bundler.add('./index.js');

    b = bundler.bundle()
        .on('error', gutil.log)
        .pipe(source('./index.js'))
        .pipe(gulp.dest('../'))
        .pipe(streamify(uglify()))
        .pipe(rename('jayn.min.js'))
        .pipe(gulp.dest('./dist'));

});
