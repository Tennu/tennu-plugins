const RegistryKeyAlreadySet = require('errors').RegistryKeyAlreadySet;

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
        }

        forEach: function (fn) {
            Object.keys(impl).forEach(function (key) {
                fn(key, impl[key]);
            });
        }
    };
};

module.exports = Registry;