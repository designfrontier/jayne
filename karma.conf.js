export default function (config) {

    config.set({
        basePath: './',

        files: [
            './modules/**/*.js'
        ],

        preprocessors: {
            './modules/**/*.js': ['browserify', 'coverage']
        },

        browserify: {
            debug: true,
            transform: ['babelify']
        },

        coverageReporter: {
            type : 'lcov',
            dir : 'coverage/',
            includeAllSources: true,

            reporters: [
                { type: 'lcov', subdir: '.' },
                { type: 'text-summary'}
            ]
        },

        browsers: ['PhantomJS'],
        frameworks: ['mocha', 'chai', 'browserify'],
        reporters: ['spec', 'coverage'],
        port: 9876,
        colors: true
    });
}
