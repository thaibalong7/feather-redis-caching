"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function timeLimited(client, cmd, timeLimit) {
    return function () {
        var _arg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _arg[_i] = arguments[_i];
        }
        var argsAsArr = Array.prototype.slice.call(arguments), cb = argsAsArr.pop(), timeoutHandler;
        timeoutHandler = setTimeout(function () {
            cb(new Error('Redis timed out'));
            cb = function () { };
        }, timeLimit);
        argsAsArr.push(function (err, values) {
            clearTimeout(timeoutHandler);
            cb(err, values);
        });
        client[cmd].apply(client, argsAsArr);
    };
}
exports.default = timeLimited;
//# sourceMappingURL=time-limited.js.map