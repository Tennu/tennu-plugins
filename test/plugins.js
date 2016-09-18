const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const PluginSystem = require("../lib/plugins.js");
const failures = require("../lib/failures.js");

const examples = require("../examples/index.js");

describe("Plugin System", function () {
    var context, system;

    beforeEach(function () {
        context = {};
        system = PluginSystem(context);
    });

    describe("Installation", function () {
        describe.skip("Failure: PluginFactory is not an object", function () {});
        // May end up making this one part of the previous when implemented.
        describe.skip("Failure: PluginFactory is null", function () {});

        it("of a single bare plugin", function () {
            const installationResult = system.install(examples["bare"]);
            assert(installationResult.isOk());
            assert(system.hasPlugin("bare"));
            assert(equal(system.loadedNames(), ["bare"]));
        });

        it("of multiple bare plugins", function () {
            system.install(examples["bare"]);
            system.install(examples["bare-alt-name"]);
            assert(system.hasPlugin("bare"));
            assert(system.hasPlugin("bare-alt-name"));
        });

        describe("of plugins with dependencies;", function () {
            describe.skip("Failure: PluginFactory requires property not an array", function () {});

            it("Plugin's single required plugin is loaded", function () {
                const imports = {
                    name: "requires-exports-true",
                    requires: ["exports-true"],

                    init: function (context, imports) {
                        assert(imports["exports-true"] === true);
                        return {};
                    },
                };

                const exportsResult = system.install(examples["exports-true"]);
                logfn(inspect(exportsResult, {colors: true}));
                assert(exportsResult.isOk());
                const importsResult = system.install(imports);

                importsResult.mapFail((fail) => logfn(inspect()));

                assert(importsResult.isOk());
            });

            it.skip("isInstallableWith/2 Plugin's single required plugin is assumed loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's single required plugin is not loaded. No other plugins loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's single required plugin is not loaded. Other plugins loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's single required plugin is not loaded. No other plugins loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's single required plugin is not loaded. No other plugins loaded. Other plugins assumed loaded", function () {});
            it.skip("isInstallable/1 Plugin's multiple required plugins are loaded", function () {});
            it.skip("isInstallableWith/2 Plugin's multiple required plugins are all assumed loaded", function () {});
            it.skip("isInstallableWith/2 Plugin's multiple required plugins are all either loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's multiple required plugins where none are loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's multiple required plugins where some are loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's multiple required plugins where none are loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's multiple required plugins where some are assumed loaded", function () {});
        });


        describe("of plugins with role dependencies;", function () {
            it("that requires a single plugin of a specific role", function (done) {
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

                const roleResult = system.install(role);
                assert(roleResult.isOk());
                const usesRoleResult = system.install(usesRole);
                usesRoleResult.mapFail((fail) => logfn(inspect(fail)));
                assert(usesRoleResult.isOk());
            });

            it.skip("isInstallableWith/2 Plugin's single required role is assumed loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's single required role is not loaded. No other plugins loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's single required role is not loaded. Other plugins loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's single required role is not loaded. No other plugins loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's single required role is not loaded. No other plugins loaded. Other plugins assumed loaded", function () {});
            it.skip("isInstallable/1 Plugin's multiple required roles are loaded", function () {});
            it.skip("isInstallableWith/2 Plugin's multiple required roles are all assumed loaded", function () {});
            it.skip("isInstallableWith/2 Plugin's multiple required roles are all either loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's multiple required roles where none are loaded", function () {});
            it.skip("Failure: isInstallable/1 Plugin's multiple required roles where some are loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's multiple required roles where none are loaded or assumed loaded", function () {});
            it.skip("Failure: isInstallableWith/2 Plugin's multiple required roles where some are assumed loaded", function () {});
        });

        it("function gets a reference to the context", function () {
            const plugin = {
                init: function (_context) {
                    assert(context === _context);
                    return {};
                },
                name: "context-test"
            };

            const result = system.install(plugin);
            assert(result.isOk());
        });

        it("of a plugin with a role", function () {
            const result = system.install(examples["waltz"]);
            if (result.isFail()) {
                logfn(inspect(result.fail()));
            }
            assert(result.isOk());
            assert(system.hasPlugin("waltz"));
            assert(system.hasRole("dancer"));
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

            system.install(addsTestHook);
            system.install(examples["has-test-hook"]);
        });

        describe("Failure: [PluginAlreadyExists] Installation of two plugins with the same name", function () {
            beforeEach(function () {
                const result = system.install(examples["bare"]);
                assert(result.isOk());
            });

            const installationValidationExpected = {
                canInstall: false,
                failureReason: failures.validation.PluginAlreadyExists,
                reason: "A plugin with the name 'bare' has already been installed.",
                pluginFactory: examples["bare"]
            };

            it("via isInstallable()", function () {
                const validation = system.isInstallable(examples["bare"]);

                logfn(inspect(validation, {colors: true}));
                assert(equal(validation, installationValidationExpected));
            });

            it("via install()", function () {
                const result = system.install(examples["bare"]);
                assert(result.isFail());
                const validationFailure = result.fail();
                logfn(validationFailure);
                assert(equal(validationFailure, {
                    failureReason: failures.CannotInstall,
                    message: "The plugin cannot be installed. For why, check the validationFailure.",
                    validationFailure: installationValidationExpected,
                    validationFailureTypes: failures.validation,
                    pluginFactory: examples["bare"]
                }));
            });
        });

        describe("Failure: [RoleAlreadyExists] Installation of two plugins with the same role", function () {
            beforeEach(function () {
                const result = system.install(examples["waltz"]);
                assert(result.isOk());
            });

            const installationValidationExpected = {
                canInstall: false,
                failureReason: failures.validation.RoleAlreadyExists,
                reason: "A plugin with the role 'dancer' has already been installed.",
                pluginFactory: examples["tango"]
            };

            it("via isInstallable", function () {
                const validation = system.isInstallable(examples["tango"]);

                assert(equal(validation, installationValidationExpected));
            });
        });

        describe.skip("Failure: isInstallable/1 Plugin's name property is not a string", function () {});
        describe.skip("Failure: isInstallable/1 Plugin's name collides with an already loaded plugin", function () {});
        describe.skip("Failure: isInstallableWith/2 Plugin's name collides with already assumed plugin's name", function () {});

    });

    describe("Instance Hooks", function () {
        var spy;

        beforeEach(function () {
            spy = sinon.spy();
            const result = system.addInstanceHook("test", spy);
            assert(result.isOk());
        });

        it("hooks into every loaded module", function () {
            const result = system.install(examples["has-test-hook"]);
            assert(result.isOk());
            assert(spy.calledOnce);
            assert(spy.calledWith("has-test-hook", true));
        });

        it("skips plugins not using the hook", function () {
            const result = system.install(examples["bare"]);
            assert(result.isOk());
            assert(!spy.called);
        });

        it("Failure: Adding the same hook name twice", function () {
            const result = system.addInstanceHook("test", function () {});
            assert(result.isFail());
            const fail = result.fail();
            assert(equal(fail, {
                failureReason: failures.InstanceHookAlreadyExists,
                message: "Tried to set instance hook 'test', but a plugin already has that instance hook.",
                hook: "test"
            }));
        });

        it.skip("can have a symbol for the hook name", function () {});

        it.skip("having multiple hooks", function () {});

        it.skip("Error: Hook name not string or symbol", function () {});
        it.skip("Error: Hook function not a function.", function () {});
    });

    describe("Static Hooks", function () {
        var spy, setinel;

        beforeEach(function () {
            spy = sinon.spy();
            setinel = {};
            system.addStaticHook("test", spy);
        });

        it("hooks into every loaded module", function () {
            system.install({
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
            system.install({
                name: "TEST",
                init: function () {
                    assert(!spy.called);
                    return {};
                }
            });
        });

        it("Failure: Adding the same hook name twice", function () {
            const leftResult = system.install({
                name: "static-left",
                init: function () {
                    return {
                        staticHooks: {
                            static: function () {}
                        }
                    };
                }
            });

            leftResult.ok("Left result should be ok.");

            const rightResult = system.install({
                name: "static-right",
                init: function () {
                    return {
                        staticHooks: {
                            static: function () {}
                        }
                    };
                }
            });

            const fail = rightResult.fail("Right result should be a failure.");

            assert(equal(fail, {
                failureReason: failures.StaticHookAlreadyExists,
                message: "Tried to set static hook 'static', but a plugin already has that static hook.",
                hook: "static"
            }));
        });

        it.skip("can have a symbol for the hook name", function () {});

        it.skip("having multiple hooks", function () {});

        it.skip("Error: Hook name not string or symbol", function () {});
        it.skip("Error: Hook function not a function.", function () {});
    });

    describe("Has", function () {
        it("for plugins", function () {
            system.install({
                name: "module",
                init: function () { return {}; },
            });

            assert(system.hasPlugin("module"));
        });

        it("for roles", function () {
            system.install({
                init: function () { return {}; },
                name: "provides-role",
                role: "role"
            });

            assert(system.hasRole("role"));
        });
    });

    describe("Exports Getters", function () {
        it("for plugins", function () {
            const result = system.install(examples["exports-true"]);
            if (result.isFail()) {
                logfn(inspect(result.fail()));
            }
            assert(result.isOk());
            assert(system.pluginExportsOf("exports-true").ok() === true);
        });

        it("Failure: PluginNotInstalled for non-existent plugin", function () {
            assert(system.pluginExportsOf("dne").isFail());
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

            system.install(roleWithExports);
            assert(system.roleExportsOf("exports").ok() === exports);
        });

        it("Failure: RoleNotInstalled for non-existent role", function () {
            assert(system.roleExportsOf("dne").isFail());
        });
    });
});