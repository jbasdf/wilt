'use strict';

// Include Gulp and other build automation tools and utilities
// See: https://github.com/gulpjs/gulp/blob/master/docs/API.md
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var es = require('event-stream');
var path = require('path');
var runSequence = require('run-sequence');
var webpack = require('webpack');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var ReactTools = require('react-tools');
var fileinclude = require('gulp-file-include');
var rename = require('gulp-rename');
var browserSync = require('browser-sync');
var url = require('url');

var watch = false;

// Settings
var DEST = './build';
var DEBUG = !argv.release;
var LOG = !!argv.log;

var AUTOPREFIXER_BROWSERS = [                 // https://github.com/ai/autoprefixer
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

// Node.js runtime dependencies and their version numbers
var pkgs = require('./package.json').dependencies;
Object.keys(pkgs).forEach(function (key) { return pkgs[key] = pkgs[key].substring(1); });

// Configure JSX Harmony transform in order to be able
// require .js files with JSX (see 'pages' task)
var originalJsTransform = require.extensions['.js'];
var reactTransform = function(module, filename) {
  if (filename.indexOf('node_modules') === -1) {
    var src = fs.readFileSync(filename, {encoding: 'utf8'});
    src = ReactTools.transform(src, {harmony: true, stripTypes: true});
    module._compile(src, filename);
  } else {
    originalJsTransform(module, filename);
  }
};
require.extensions['.js'] = reactTransform;

// Clean up
// -----------------------------------------------------------------------------
gulp.task('clean', function (cb) {
    var rimraf = require('rimraf');
    rimraf(DEST, cb);
});

// Copy vendor files
// -----------------------------------------------------------------------------
gulp.task('vendor', function () {
    return es.merge(
        gulp.src('./node_modules/jquery/dist/**')
            .pipe(gulp.dest(DEST + '/vendor/jquery-' + pkgs.jquery)),
        gulp.src('./node_modules/bootstrap-sass/assets/fonts/**')
            .pipe(gulp.dest(DEST + '/fonts')),
        gulp.src('./node_modules/font-awesome/fonts/**')
            .pipe(gulp.dest(DEST + '/fonts'))
    );
});

// Copy static files / assets
// -----------------------------------------------------------------------------
gulp.task('assets', function () {
    return es.merge(
        gulp.src('./src/assets/**')
            .pipe(gulp.dest(DEST)),
        gulp.src('./src/images/**')
            .pipe(gulp.dest(DEST + '/images/')),
        gulp.src('./src/styles/fonts/**')
            .pipe(gulp.dest(DEST + '/css/fonts/')),
        gulp.src('./src/html/*.tpl.html')
            .pipe(fileinclude())
            .pipe(rename({
              extname: ""
             }))
            .pipe(rename({
              extname: ".html"
             }))
            .pipe(DEBUG ? $.util.noop() : $.htmlmin({
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true
            }))
            .pipe(DEBUG ? $.embedlr() : $.util.noop())
            .pipe(gulp.dest(DEST))
    );
});

// CSS stylesheets
// -----------------------------------------------------------------------------
gulp.task('styles', function () {

    var sass = require('gulp-sass');
    var prefix = require('gulp-autoprefixer');
    return gulp.src('./src/styles/*.scss')
        .pipe($.plumber())
        .pipe(sass({sourceMap: 'sass', sourceComments: 'map'}))
        .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
        .on('error', $.util.log)
        .pipe(DEBUG ? $.util.noop() : $.minifyCss())
        .pipe(gulp.dest(DEST + '/css'));

});

// Create JavaScript bundle
// -----------------------------------------------------------------------------
gulp.task('bundle', function (cb) {
    var started = false;
    var config = require('./config/webpack.config.js')(DEBUG);
    var bundler = webpack(config);

    function bundle (err, stats) {
        if (err) {
            throw new $.util.PluginError('webpack', err);
        }
        LOG && $.util.log('[webpack]', stats.toString({colors: true}));
    
        if (!started) {
            started = true;
            return cb();
        }
    }

    if (watch) {
        bundler.watch(200, bundle);
    } else {
        bundler.run(bundle);
    }
});

// Build the app from source code
// -----------------------------------------------------------------------------
gulp.task('build', ['clean'], function (cb) {
    runSequence(['vendor', 'assets', 'styles', 'bundle'], cb);
});

// Launch a lightweight HTTP Server
// -----------------------------------------------------------------------------
gulp.task('serve', function(cb) {

  watch = true;

  runSequence('build', function() {
    browserSync({
      notify: false,
      // Customize the BrowserSync console logging prefix
      logPrefix: 'RSK',
      // Run as an https by uncommenting 'https: true'
      // Note: this uses an unsigned certificate which on first access
      //       will present a certificate warning in the browser.
      // https: true,
      server: {
        baseDir: DEST,
        // Allow web page requests without .html file extension in URLs
        middleware: function(req, res, cb) {
          var uri = url.parse(req.url);
          if (uri.pathname.length > 1 &&
            uri.pathname.lastIndexOf('/browser-sync/', 0) !== 0 &&
            !fs.existsSync(DEST + uri.pathname)) {
            if (fs.existsSync(DEST + uri.pathname + '.html')) {
              req.url = uri.pathname + '.html' + (uri.search || '');
            } else {
              res.statusCode = 404;
              req.url = '/404.html' + (uri.search || '');
            }
          }
          cb();
        }
      }
    });

    gulp.watch('./src/assets/**', ['assets']);
    gulp.watch('./src/**/*.scss', ['styles']);
    gulp.watch('./src/js/**/*.js', ['bundle']);
    gulp.watch('./src/html/*.html', ['assets']);
    gulp.watch('./src/js/**/*.html', ['bundle']);
    gulp.watch('./vendor/**/*.js', ['bundle']);

    gulp.watch(DEST + '/**/*.*', function(file) {
        var relPath = DEST.substring(2) + '\\' + path.relative(DEST, file.path);
        $.util.log('File changed: ' + $.util.colors.magenta(relPath));
        browserSync.reload(path.relative(__dirname, file.path));
    });
    cb();
  });
});

// Deploy to GitHub Pages. See: https://pages.github.com
// -----------------------------------------------------------------------------
gulp.task('deploy', ['build'], function (cb) {
    //var url = 'https://github.com/{name}/{name}.github.io.git';
    //var exec = require('child_process').exec;
    //var cwd = path.join(__dirname, DEST);
    // var cmd = 'git init && git remote add origin ' + url + ' && ' +
    //           'git add . && git commit -m Release && ' +
    //           'git push -f origin master';
    //var cmd = 's3_website push';
    // exec(cmd, { 'cwd': cwd }, function (err, stdout, stderr) {
    //     if (err !== null) {
    //         cb(err);
    //     } else {
    //         $.util.log(stdout, stderr);
    //         cb();
    //     }
    // });
});

// The default task
gulp.task('default', ['serve']);