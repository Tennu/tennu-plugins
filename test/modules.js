const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};

const ModuleSystem = require("../lib/modules.js");
const errors = require("../lib/errors.js");

const examples = require("../examples/index.js");

describe("Module System", function () {
    var context, system;

    beforeEach(function () {
        logfn(/* newline */);
        context = {};
        system = ModuleSystem(context);
    });

    it("initializes a bare module", function () {
        system.initialize(examples.bare);
        assert(system.isLoaded("bare"));
        assert(equal(system.loadedNames(), ["bare"]));
    });

    it("will not initialize the same module twice", function () {
        system.initialize(examples.bare);

        try {
            system.initialize(examples.bare);
            assert(false);
        } catch (e) {
            assert(e instanceof errors.ModuleInitializationError);
            assert(e.module = examples.bare);
        }
    });

    describe("Global Hooks", function () {
        var spy;

        beforeEach(function () {
            spy = sinon.spy();
            system.addHook('test', spy);
        });

        it('hooks into every loaded module', function () {
            system.initialize(examples['test-hook']);
            assert(spy.calledOnce);
            assert(spy.calledWith(true));
        });
    });
});