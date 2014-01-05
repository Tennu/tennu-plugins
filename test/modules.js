const sinon = require('sinon');
const assert = require('better-assert');
const equal = require('deep-eql');
const inspect = require('util').inspect;
const format = require('util').format;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const ModuleSystem = require('../lib/modules.js');
const errors = require('../lib/errors.js');

const examples = require('../examples/index.js');

describe('Module System', function () {
    var context, system;

    beforeEach(function () {
        logfn(/* newline */);
        context = {};
        system = ModuleSystem(context);
    });

    describe('initialization', function () {
        it('of a bare module', function () {
            system.initialize(examples['bare']);
            assert(system.hasModule('bare'));
            assert(equal(system.loadedNames(), ['bare']));
        });

        it('gets a reference to the context', function () {
            const module = {
                init: function (_context) {
                    assert(context === _context);
                    return {};
                },
                name: 'context-test'
            };

            system.initialize(module);
        });

        it('cannot initialize the same module name twice', function () {
            system.initialize(examples['bare']);
            assert(!system.isInitializable(examples['bare']));
        });

        it('will fail with same module name twice', function () {
            try {
                system.initialize(examples['bare']);
                assert(false);
            } catch (e) {
                assert(e instanceof errors.ModuleInitializationError);
                assert(e.module = examples.bare);
            }
        });

        it('can load modules with different names', function () {
            system.initialize(examples['bare']);
            system.initialize(examples['bare-2']);
            assert(system.hasModule('bare'));
            assert(system.hasModule('bare-2'));
        });

        it('of a module with a role', function () {
            system.initialize(examples['bare-role-1']);
            assert(system.hasModule('bare-role-1'));
            assert(system.hasRole('bare'));
        });

        it('cannot initialize multiple modules with the same role', function () {
            system.initialize(examples['bare-role-1']);
            assert(!system.isInitializable(examples['bare-role-2']));
        });

        it('with importing modules', function () {
            const imports = {
                init: function (context, imports) {
                    assert(imports.exports === true);
                    return {};
                },
                name: 'imports-test',
                requires: ['exports']
            };

            system.initialize(examples['exports']);
            system.initialize(imports);
        });

        it('with hooks', function (done) {
            const hooks = {
                init: function () {
                    return {
                        hooks: {
                            'test': function (name, value) {
                                assert(name === 'test-hook');
                                assert(value === true);
                                done();
                            }
                        }
                    }
                },
                name: 'hooks'
            };

            system.initialize(hooks);
            system.initialize(examples['test-hook']);
        });

        it('with importing roles', function (done) {
            const role = {
                init: function () {
                    return {
                        exports: true
                    }
                },
                name: 'role',
                role: 'role'
            };

            const usesRole = {
                init: function (_context, imports) {
                    assert(imports.role === true);
                    done();
                    return {};
                },
                name: 'uses-role',
                requiresRoles: ['role']
            };

            system.initialize(role);
            system.initialize(usesRole);
        });
    });

    describe('Global Hooks', function () {
        var spy;

        beforeEach(function () {
            spy = sinon.spy();
            system.addHook('test', spy);
        });

        it('hooks into every loaded module', function () {
            system.initialize(examples['test-hook']);
            assert(spy.calledOnce);
            assert(spy.calledWith('test-hook', true));
        });

        it('skips modules not using the hook', function () {
            system.initialize(examples['bare']);
            assert(!spy.called);
        });
    });
});