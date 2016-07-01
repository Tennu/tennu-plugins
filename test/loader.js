const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const resolvepath = require("path").resolve;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const PluginLoader = require("../lib/loader.js");
const PluginSystem = require("../lib/plugins.js");
const failures = require("../lib/failures.js");

const root = require("path").resolve("/");

describe("PluginLoader", function () {
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
            logfn(format("Requiring %s", path));
            assert(pathToPlugins.hasOwnProperty(path) || pathToPlugins.hasOwnProperty(path + ".js"));
            return pathToPlugins[resolvepath(path, "./index.js")] || pathToPlugins[path + ".js"];
        };

        loader = PluginLoader(PluginSystem(null), fs, require, "test");
    });

    it("loads no plugins when given no plugins to load", function () {
        loader.use([], root);
    });

    it("loads a plugin when given a plugin to load", function () {
        pathToPlugins["/test_plugins/plugin.js"] = {
            init: function () { return {}; }
        };

        loader.use(["plugin"], root);
    });

    it("loads plugins only when they are ready to be loaded", function (done) {
        var callOrder = 1;

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
    });

    it("Failure: NoSuchPlugin for non-existent plugins.", function () {
        const result = loader.use(["does-not-exist"], root);

        assert(result.isFail());
        const fail = result.fail();

        assert(equal(fail, {
            failureReason: failures.NoSuchPlugin,
            message: "Failed to locate plugin 'does-not-exist'",
            name: "does-not-exist",
            paths: ["/"]
        }));
    });

    it("Failure: UnmetDependency when plugin requires a plugin not loaded or in use array", function () {
        const requiresNonexistent = {
            name: "requires-nonexistent",
            requires: ["does-not-exist"],
            init: function () {
                assert(false);
                return {};
            }
        }

        pathToPlugins["/test_plugins/requires-nonexistent.js"] = requiresNonexistent;

        const result = loader.use(["requires-nonexistent"], root);
        assert(result.isFail());
        const fail = result.fail();

        assert(equal(fail, {
            failureReason: failures.UnmetDependency,
            message: "Reason unknown (unimplemented)"
        }));
    });

    it("Failure: UnmetDependency when two plugins require each other", function () {
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

        const result = loader.use(["second", "first"], root);
        assert(result.isFail());
        const fail = result.fail();

        assert(equal(fail, {
            failureReason: failures.UnmetDependency,
            message: "Reason unknown (unimplemented)"
        }));
    });

    it("Error: TypeError if path is not a string.", function () {
        try {
            loader.use([], undefined);
            assert(false);
        } catch (e) {
            if (e.name === "AssertionError") throw e;
            assert(e instanceof TypeError);
        }
    });
});