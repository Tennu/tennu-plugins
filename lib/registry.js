const RegistryKeyAlreadySet = require('./failures').RegistryKeyAlreadySet;
const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const Registry = function () {
    // Using an object instead of a Map because supporting Node.js 0.10/0.12 still.
    const impl = {};

    return {
        get: function (key) {
            return impl[key];
        },

        set: function (key, value) {
            if (impl[key]) {
                return Fail({
                    failureType: RegistryKeyAlreadySet,
                    message: "Key '" + key + "' already set in registry.",
                    key: key
                });
            }

            impl[key] = value;

            return Ok();
        },

        has: function (key) {
            return impl[key] !== undefined;
        },

        forEach: function (fn) {
            Object.keys(impl).forEach(function (key) {
                fn(key, impl[key]);
            });
        },

        keys: function () {
            return Object.keys(impl);
        },

        toObject: function () {
            var clone = {};

            Object.keys(impl).forEach(function (key) {
                clone[key] = impl[key];
            });

            return clone;
        }
    };
};

module.exports = Registry;