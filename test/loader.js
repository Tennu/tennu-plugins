const sinon = require('sinon');
const assert = require('better-assert');
const equal = require('deep-eql');
const inspect = require('util').inspect;
const format = require('util').format;

const resolvepath = require('path').resolve;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const PluginLoader = require('../lib/loader.js');
const PluginSystem = require('../lib/plugins.js');
const errors = require('../lib/errors.js');

const root = require('path').resolve('/');

describe('PluginLoader', function () {
    var loader, fs, require, plugins;

    beforeEach(function () {
        logfn(/* newline */);

        // Tests will add paths here with values of Plugins.
        pathToPlugins = {};

        fs = {
            existsSync: function (path) {
                return pathToPlugins.hasOwnProperty(path);
            }
        };

        require = function (path) {
            logfn(format('Requiring %s', path));
            assert(pathToPlugins.hasOwnProperty(path) || pathToPlugins.hasOwnProperty(path + '.js'));
            return pathToPlugins[resolvepath(path, './index.js')] || pathToPlugins[path + '.js'];
        };

        loader = PluginLoader(PluginSystem(null), fs, require, 'test');
    });

    it('loads no plugins when given no plugins to load', function () {
        loader.use([], root);
    });

    it('loads a plugin when given a plugin to load', function () {
        pathToPlugins['/test_plugins/plugin.js'] = {
            init: function () { return {}; }
        };

        loader.use(['plugin'], root);
    });

    it('loads plugins only when they are ready to be loaded', function (done) {
        const first = {
            init: function () {
                return {
                    hooks: {
                        test: function (name, value) {
                            done();
                        }
                    }
                };
            }
        };

        const second = {
            init: function () {
                return {
                    test: true
                };
            },
            requires: ['first']
        };

        pathToPlugins['/test_plugins/first.js'] = first;
        pathToPlugins['/test_plugins/second.js'] = second;

        loader.use(['second', 'first'], root);
    });

    it('throws NoSuchPlugin for non-existent plugins.', function () {
        try {
            loader.use(['does-not-exist'], root);
        } catch (e) {
            assert(e instanceof Error);
            assert(e instanceof errors.NoSuchPlugin);
        }
    });

    it('throws UnmetDependency when plugin requires a plugin not loaded or in use array', function () {
        const requiresNonexistent = {
            init: function () {
                assert(false);
                return {};
            }
        }

        try {
            loader.use(['requires-nonexistent'], root);
            assert(false);
        } catch (e) {
            if (e.name === 'AssertionError') throw e;
            assert(e instanceof Error);
            assert(e instanceof errors.UnmetDependency);
        }
    });

    it('throws UnmetDependency when two plugins require each other', function () {
        const first = {
            init: function () {
                return {};
            },
            requires: ['second']
        };

        const second = {
            init: function () {
                return {};
            },
            requires: ['first']
        };

        pathToPlugins['/test_plugins/first.js'] = first;
        pathToPlugins['/test_plugins/second.js'] = second;

        try {
            loader.use(['second', 'first'], root);
            assert(false);
        } catch (e) {
            if (e.name === 'AssertionError') throw e;
            assert(e instanceof errors.UnmetDependency);
            assert(e instanceof Error);
        }
    });

    it('throws TypeError if path is not a string.', function () {
        try {
            loader.use([], undefined);
            assert(false);
        } catch (e) {
            if (e.name === 'AssertionError') throw e;
            assert(e instanceof TypeError);
        }
    });
});