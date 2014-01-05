const sinon = require('sinon');
const assert = require('better-assert');
const equal = require('deep-eql');
const inspect = require('util').inspect;
const format = require('util').format;

const resolvepath = require('path').resolve;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const ModuleLoader = require('../lib/loader.js');
const ModuleSystem = require('../lib/modules.js');
const errors = require('../lib/errors.js');

const root = require('path').resolve('/');

describe("ModuleLoader", function () {
    var loader, fs, require, modules;

    beforeEach(function () {
        logfn(/* newline */);

        // Tests will add paths here with values of Modules.
        pathToModules = {};

        fs = {
            existsSync: function (path) {
                return pathToModules.hasOwnProperty(path);
            }
        };

        require = function (path) {
            logfn(format("Requiring %s", path));
            assert(pathToModules.hasOwnProperty(path) || pathToModules.hasOwnProperty(path + ".js"));
            return pathToModules[resolvepath(path, './index.js')] || pathToModules[path + '.js'];
        };

        loader = ModuleLoader(ModuleSystem(null), fs, require, 'test');
    });

    it('loads no modules when given no modules to load', function () {
        loader.use([], root);
    });

    it('loads a module when given a module to load', function () {
        pathToModules['/test_modules/module.js'] = {
            init: function () { return {}; }
        };

        loader.use(['module'], root);
    });

    it('gives NoSuchModule for non-existent modules.', function () {
        try {
            loader.use(['does-not-exist'], root);
        } catch (e) {
            assert(e instanceof errors.NoSuchModule);
        }
    });

    it('loads modules only when they are ready to be loaded', function (done) {
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

        pathToModules['/test_modules/first.js'] = first;
        pathToModules['/test_modules/second.js'] = second;

        loader.use(['second', 'first'], root);
    });

    it('throws UnmetDependency when module requires a module not loaded or in use array', function () {
        const requiresNonexistent = {
            init: function () {
                assert(false);
                return {};
            }
        }

        pathToModules['/test_modules/requires-nonexistent.js'] = requiresNonexistent;

        try {
            loader.use(['requires-nonexistent']);
            assert(false);
        } catch (e) {
            assert(e instanceof errors.UnmetDependency);
        }
    });

    it('throws UnmetDependency when two modules require each other', function () {
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

        pathToModules['/test_modules/first.js'] = first;
        pathToModules['/test_modules/second.js'] = second;

        try {
            loader.use(['second', 'first'], root);
            assert(false);
        } catch (e) {
            assert(e instanceof errors.UnmetDependency);
        }
    });
});