// This plugin has a hook property 'test' that just has the value `true`.

module.exports = {
    name: "has-test-hook",

    init: function () {
        return {
            test: true
        };
    }
};