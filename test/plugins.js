const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const PluginSystem = require("../lib/plugins.js");
const failures = require("../lib/failures.js");

const examples = require("../examples/index.js");

describe("Plugin System", function () {
    var context, system;

    beforeEach(function () {
        logfn(/* newline */);
        context = {};
        system = PluginSystem(context);
    });

    describe("Initialization", function () {
        it("of a bare plugin", function () {
            const initializationResult = system.initialize(examples["bare"]);
            assert(initializationResult.isOk());
            assert(system.hasPlugin("bare"));
            assert(equal(system.loadedNames(), ["bare"]));
        });

        it("of multiple bare plugins", function () {
            system.initialize(examples["bare"]);
            system.initialize(examples["bare-alt-name"]);
            assert(system.hasPlugin("bare"));
            assert(system.hasPlugin("bare-alt-name"));
        });

        it("function gets a reference to the context", function () {
            const plugin = {
                init: function (_context) {
                    assert(context === _context);
                    return {};
                },
                name: "context-test"
            };

            const result = system.initialize(plugin);
            assert(result.isOk());
        });

        it("of a plugin with a role", function () {
            const result = system.initialize(examples["waltz"]);
            assert(result.isOk());
            assert(system.hasPlugin("waltz"));
            assert(system.hasRole("dancer"));
        });

        it("that requires a separate plugin", function () {
            const imports = {
                name: "requires-exports-true",
                requires: ["exports-true"],

                init: function (context, imports) {
                    assert(imports["exports-true"] === true);
                    return {};
                },
            };

            const exportsResult = system.initialize(examples["exports-true"]);
            assert(exportsResult.isOk());
            const importsResult = system.initialize(imports);

            if (importsResult.isFail()) {
                logfn(inspect(importsResult.fail()));
            }

            assert(importsResult.isOk());
        });

        it("of a plugin with custom hooks", function (done) {
            const addsTestHook = {
                name: "adds-test-hook",

                init: function () {
                    return {
                        hooks: {
                            "test": function (name, value) {
                                assert(name === "has-test-hook");
                                assert(value === true);
                                done();
                            }
                        }
                    }
                },
            };

            system.initialize(addsTestHook);
            system.initialize(examples["has-test-hook"]);
        });

        it("that requires a separate plugin of a specific role", function (done) {
            const role = {
                name: "has-role",
                role: "role",

                init: function () {
                    return {
                        exports: true
                    };
                }
            };

            const usesRole = {
                name: "uses-role",
                requiresRoles: ["role"],

                init: function (_context, imports) {
                    assert(imports.role === true);
                    done();
                    return {};
                }
            };

            const roleResult = system.initialize(role);
            assert(roleResult.isOk());
            const usesRoleResult = system.initialize(usesRole);
            if (usesRoleResult.isFail()) {
                logfn(inspect(usesRoleResult));
            }
            assert(usesRoleResult.isOk());
        });

        describe("Failure: Initialization of two plugins with the same name", function () {
            beforeEach(function () {
                const result = system.initialize(examples["bare"]);
                assert(result.isOk());
            });

            const initializationValidationExpected = {
                canInitialize: false,
                reason: "A plugin with this plugin's name has already been installed."
            };

            it("via isInitializable()", function () {
                const validation = system.isInitializable(examples["bare"]);

                assert(equal(validation, initializationValidationExpected));
            });

            it("via initialize()", function () {
                const result = system.initialize(examples["bare"]);
                assert(result.isFail());
                const validationFailure = result.fail();
                assert(equal(validationFailure, {
                    failureReason: failures.CannotInitialize,
                    message: "The plugin cannot be initialized. For why, check the validationFailure.",
                    validationFailure: initializationValidationExpected,
                    plugin: examples["bare"]
                }));
            });
        });

        describe("Failure: Initialization of two plugins with the same role", function () {
            beforeEach(function () {
                const result = system.initialize(examples["waltz"]);
                assert(result.isOk());
            });

            const initializationValidationExpected = {
                canInitialize: false,
                reason: "A plugin with this plugin's role's name has already been installed."
            };

            it("via isInitializable", function () {
                const validation = system.isInitializable(examples["tango"]);

                assert(equal(validation, initializationValidationExpected));
            });
        });
    });

    describe("Instance Hooks", function () {
        var spy;

        beforeEach(function () {
            spy = sinon.spy();
            const result = system.addInstanceHook("test", spy);
            assert(result.isOk());
        });

        it("hooks into every loaded module", function () {
            const result = system.initialize(examples["has-test-hook"]);
            assert(result.isOk());
            assert(spy.calledOnce);
            assert(spy.calledWith("has-test-hook", true));
        });

        it("skips plugins not using the hook", function () {
            const result = system.initialize(examples["bare"]);
            assert(result.isOk());
            assert(!spy.called);
        });

        it("Failure: Adding the same hook twice", function () {
            const result = system.addInstanceHook("test", function () {});
            assert(result.isFail());
            const fail = result.fail();
            assert(equal(fail, {
                failureReason: failures.InstanceHookAlreadyExists,
                message: "Tried to set instance hook 'test', but a plugin already has that instance hook.",
                hook: "test"
            }));
        });
    });

    describe("Static Hooks", function () {
        var spy, setinel;

        beforeEach(function () {
            spy = sinon.spy();
            setinel = {};
            system.addStaticHook("test", spy);
        });

        it("hooks into every loaded module", function () {
            system.initialize({
                test: setinel,
                name: "TEST",
                init: function () {
                    assert(spy.calledOnce);
                    assert(spy.calledWith("TEST", setinel));
                    return {};
                }
            });
        });

        it("skips plugins not using the hook", function () {
            system.initialize({
                name: "TEST",
                init: function () {
                    assert(!spy.called);
                    return {};
                }
            });
        });
    });

    describe("Has", function () {
        it("for plugins", function () {
            system.initialize({
                name: "module",
                init: function () { return {}; },
            });

            assert(system.hasPlugin("module"));
        });

        it("for roles", function () {
            system.initialize({
                init: function () { return {}; },
                name: "provides-role",
                role: "role"
            });

            assert(system.hasRole("role"));
        });
    });

    describe("Exports Getters", function () {
        it("for plugins", function () {
            const result = system.initialize(examples["exports-true"]);
            if (result.isFail()) {
                logfn(inspect(result.fail()));
            }
            assert(result.isOk());
            assert(system.pluginExportsOf("exports-true") === true);
        });

        it("for roles", function () {
            const exports = {};

            const roleWithExports = {
                init: function () {
                    return {
                        exports: exports
                    }
                },
                name: "role-with-exports",
                role: "exports"
            };

            system.initialize(roleWithExports);
            assert(system.roleExportsOf("exports") === exports);
        });
    });
});