"use strict";

const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const resolvepath = require("path").resolve;

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const PluginLoader = require("../lib/loader.js");
const PluginSystem = require("../lib/plugins.js");
const failures = require("../lib/failures.js");

const root = require("path").resolve("/");

describe("PluginLoader", function () {
    let loader, fs, require, system, pathToPlugins;

    beforeEach(function () {
        // Tests will add paths here with values of Plugins.
        pathToPlugins = {};

        fs = {
            existsSync: function (path) {
                return pathToPlugins.hasOwnProperty(path);
            }
        };

        require = function (path) {
            logfn(format("Requiring %s", path));
            assert(pathToPlugins.hasOwnProperty(path) || pathToPlugins.hasOwnProperty(path + ".js"));
            return pathToPlugins[resolvepath(path, "./index.js")] || pathToPlugins[path + ".js"];
        };

        system = PluginSystem(null);
        loader = PluginLoader(system, fs, require, "test");
    });

    it("loads no plugins when given no plugins to load", function () {
        loader.use([], root)
        .debug(logfn, {colors: true})
        .ok("Nothing can fail if nothing happens.");
    });

    it("loads a plugin when given a plugin to load", function () {
        pathToPlugins["/test_plugins/plugin.js"] = {
            name: "plugin",
            init: function () { return {}; }
        };

        const result = loader.use(["plugin"], root);

        result.debug(logfn, {colors: true});
        assert(result.isOk());
    });

    it("loads plugins only when they are ready to be loaded", function (done) {
        let callOrder = 1;

        const first = {
            name: "first",

            init: function () {
                assert(callOrder === 1);
                callOrder += 1;

                return {};
            }
        };

        const second = {
            name: "second",
            requires: ["first"],

            init: function () {
                assert(callOrder === 2);
                done();
                return {};
            }
        };

        pathToPlugins["/test_plugins/first.js"] = first;
        pathToPlugins["/test_plugins/second.js"] = second;

        const res = loader.use(["second", "first"], root);
        res.debug(logfn).ok("All plugins should be installed.");
    });

    it("Failure: [CannotFindPlugin] Non-existent plugins.", function () {
        const result = loader.use(["does-not-exist"], root);

        assert(result.isFail());
        const fail = result.fail();

        logfn(inspect(fail));
        assert(equal(fail, {
            failureType: failures.CannotFindPlugin,
            message: "Failed to locate plugin 'does-not-exist'",
            name: "does-not-exist",
            paths: ["/"]
        }));
    });

    it("Failure: [UnmetDependency] Plugin requires a plugin not loaded or in use array", function () {
        const requiresNonexistent = {
            name: "requires-nonexistent",
            requires: ["does-not-exist"],
            init: function () {
                assert(false);
                return {};
            }
        }

        pathToPlugins["/test_plugins/requires-nonexistent.js"] = requiresNonexistent;

        const result = loader.use(["requires-nonexistent"], root).debug(logfn);
        const fail = result.fail("Cannot install a plugin that requires a non-existent plugin.");

        const expectedFailure = {
            failureType: failures.use.UnmetDependency,
            message: "Plugin with name of 'does-not-exist' required but neither installed nor in to be installed list.",
            dependencyType: "name",
            dependencyName: "does-not-exist"
        };

        assert(equal(fail, expectedFailure));
    });

    it("Failure: [CyclicicDependency] Two plugins require each other", function () {
        const CyclicicDependency = failures.use.CyclicicDependency;
        assert(typeof CyclicicDependency === "symbol");

        const first = {
            init: function () {
                return {};
            },
            requires: ["second"]
        };

        const second = {
            init: function () {
                return {};
            },
            requires: ["first"]
        };

        pathToPlugins["/test_plugins/first.js"] = first;
        pathToPlugins["/test_plugins/second.js"] = second;

        const expectedFailure = {
            failureType: CyclicicDependency,
            message: "Two or more plugins depend on each other cyclicicly.",
            dependencies: [first, second]
        };

        const actualFailure = loader
        .use(["first", "second"], root)
        .debug(logfn, {colors: true})
        .fail("No plugins should be installed.");

        assert(equal(actualFailure, expectedFailure));
    });

    it("Failure: [InconsistentlyNamedPlugin] when plugin name differs from what is passed to use()", function () {
        const InconsistentlyNamedPlugin = failures.use.InconsistentlyNamedPlugin;
        assert(typeof InconsistentlyNamedPlugin === "symbol");

        pathToPlugins["/test_plugins/inconsistently-named.js"] = {
            name: "incorrectly-named",
            init: function () {}
        };

        const expectedFailure = {
            failureType: InconsistentlyNamedPlugin,
            message: ""
        };
    });

    it("Failure: [ValidatePluginFactoryFailed] Plugin Factory object is bad.", function () {
        const ValidatePluginFactoryFailed = failures.use.ValidatePluginFactoryFailed;
        assert(typeof ValidatePluginFactoryFailed === "symbol");

        pathToPlugins["/test_plugins/false.js"] = false;

        const expectedFailure = {
            failureType: ValidatePluginFactoryFailed,
            message: "An invalid plugin factory was loaded.",
            innerFailure: {
                failureType: failures.validatePluginFactory.NotAnObject,
                message: "PluginFactory must be an object. Was given a boolean instead."
            },
            innerFailureTypes: failures.validatePluginFactory
        };

        const actualFailure = loader
        .use(["false"], root)
        .debug(logfn, {colors: true})
        .fail("Successfully installed an invalid plugin factory.");

        assert(equal(actualFailure, expectedFailure));
    });

    it("Failure: [CanInstallFailed] Plugin can't be installed for reasons.", function () {
        const CanInstallFailed = failures.use.CanInstallFailed;
        assert(typeof CanInstallFailed === "symbol");

        pathToPlugins["/test_plugins/bare.js"] = {
            name: "bare",
            init: function () {
                logfn("Initializing bare. This should only happen once.");
                return {};
            }
        };

        const expectedFailure = {
            failureType: CanInstallFailed,
            message: "The plugin 'bare' cannot be installed.",
            innerFailure: {
                failureType: failures.canInstall.PluginAlreadyInstalled,
                message: "A plugin with the name 'bare' has already been installed.",
            },
            innerFailureTypes: failures.canInstall,
            pluginFactory: pathToPlugins["/test_plugins/bare.js"]
        };

        loader
        .use(["bare"], root)
        .debug(logfn, {colors: true})
        .ok("Successfully installed 'bare'.");

        const actualFailure = loader
        .use(["bare"], root)
        .debug(logfn, {colors: true})
        .fail("Cannot install 'bare' a second time.");

        assert(equal(actualFailure, expectedFailure));
    });

    it("Failure: [InstallFailed] Plugin install fails.", function () {
        const InstallFailed = failures.use.InstallFailed;
        assert(typeof InstallFailed === "symbol");

        pathToPlugins["/test_plugins/plugin-not-an-object.js"] = {
            name: "plugin-not-an-object",
            init: function () {
                logfn("Initializing plugin-not-an-object. This should only happen once.");
            }
        };

        const expectedFailure = {
            failureType: InstallFailed,
            message: "Installing the plugin 'plugin-not-an-object' failed.",
            innerFailure: {
                failureType: failures.install.PluginNotAnObject,
                message: "Plugin 'plugin-not-an-object' must be an object. Init function returned `undefined`, undefined, instead.",
                pluginFactory: pathToPlugins["/test_plugins/plugin-not-an-object.js"]
            },
            innerFailureTypes: failures.install,
            pluginFactory: pathToPlugins["/test_plugins/plugin-not-an-object.js"]
        };

        const actualFailure = loader
        .use(["plugin-not-an-object"], root)
        .debug(logfn, {colors: true})
        .fail("Cannot install 'bare' a second time.");

        assert(equal(actualFailure, expectedFailure));
    })

    it("Error: [TypeError] Path parameter is not a string", function () {
        try {
            loader.use([], undefined);
            assert(false);
        } catch (e) {
            if (e.name === "AssertionError") throw e;
            assert(e instanceof TypeError);
        }
    });
});