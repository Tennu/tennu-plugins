// This plugin just exports the value "true".

module.exports = {
    name: "exports-true",

    init: function () {
        return {
            exports: true
        };
    },
};