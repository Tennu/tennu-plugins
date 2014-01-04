const RegistryKeyAlreadySet = require('./errors.js').RegistryKeyAlreadySet;

const Registry = function () {
    const impl = {};

    return {
        get: function (key) {
            return impl[key];
        },

        set: function (key, value) {
            if (impl[key]) {
                throw new RegistryKeyAlreadySet("Key " + key + " already set in registry.", key);
            }

            impl[key] = value;
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