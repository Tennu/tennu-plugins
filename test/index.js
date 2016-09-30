"use strict";

// const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
// const inspect = require("util").inspect;
// const format = require("util").format;

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const index = require("../lib/index");

describe("Index (Module Root)", function () {
    it("Is a function", function () {
        assert(typeof index === "function");
    });

    it("Has a failures property", function () {
        assert(typeof index.failures === "object");
    });

    it("When called, returns an object", function () {
        const system = index("systemName", {paramName: "context"});

        const undefinedProperties = Object.keys(system).filter(function (key) {
            return system[key] === undefined;
        });

        logfn(`Undefined Keys: [${undefinedProperties.join(", ")}]`);

        assert(equal(undefinedProperties, []));
    });
});