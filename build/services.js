"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var async_1 = __importDefault(require("async"));
var DISABLE_REDIS_CACHE = process.env.DISABLE_REDIS_CACHE;
var HTTP_OK = 200;
var HTTP_NO_CONTENT = 204;
var HTTP_SERVER_ERROR = 500;
var HTTP_NOT_FOUND = 404;
var DEFAULT_REDIS_CLIENT = 'redisClient';
var serviceClearSingle = function (options) {
    if (options === void 0) { options = {}; }
    var redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
    return {
        setup: function (app, path) {
            this.app = app;
            this.path = path;
        },
        find: function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var client, target;
                return __generator(this, function (_a) {
                    client = this.app.get(redisClient);
                    target = params.query.target;
                    if (!target) {
                        return [2, {
                                message: 'You must provide key',
                                status: HTTP_NOT_FOUND
                            }];
                    }
                    if (!client) {
                        return [2, {
                                message: 'Redis unavailable',
                                status: HTTP_SERVER_ERROR
                            }];
                    }
                    return [2, new Promise(function (resolve) {
                            client.get(target, function (err, reply) {
                                if (err) {
                                    return resolve({ message: 'something went wrong' + err.message });
                                }
                                if (!reply) {
                                    return resolve({
                                        message: "cache already cleared for key " + target,
                                        status: HTTP_NO_CONTENT
                                    });
                                }
                                client.del(target, function (err, reply) {
                                    if (err) {
                                        return resolve({ message: 'something went wrong' + err.message });
                                    }
                                    if (!reply) {
                                        return resolve({
                                            message: "cache already cleared for key " + target,
                                            status: HTTP_NO_CONTENT
                                        });
                                    }
                                    resolve({
                                        message: "cache cleared for key " + target,
                                        status: HTTP_OK
                                    });
                                });
                            });
                        })];
                });
            });
        }
    };
};
var serviceClearGroup = function (options) {
    if (options === void 0) { options = {}; }
    var redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
    return {
        setup: function (app, path) {
            this.app = app;
            this.path = path;
        },
        find: function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var client, target;
                var _this = this;
                return __generator(this, function (_a) {
                    client = this.app.get(redisClient);
                    target = params.query.target;
                    if (!client) {
                        return [2, {
                                message: 'Redis unavailable',
                                status: HTTP_SERVER_ERROR
                            }];
                    }
                    return [2, new Promise(function (resolve) {
                            client.lrange("group-" + target, 0, -1, function (err, reply) {
                                if (err) {
                                    return resolve({ message: 'something went wrong' + err.message });
                                }
                                if (!reply || !Array.isArray(reply) || reply.length <= 0) {
                                    return resolve({
                                        message: "cache already cleared for the group key: " + target,
                                        status: HTTP_NO_CONTENT
                                    });
                                }
                                async_1.default.eachOfLimit(reply, 10, async_1.default.asyncify(function (key) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        return [2, new Promise(function (res) {
                                                client.del(key, function (err, reply) {
                                                    if (err) {
                                                        return res({ message: 'something went wrong' + err.message });
                                                    }
                                                    if (!reply) {
                                                        return res({
                                                            message: "cache already cleared for key " + target,
                                                            status: HTTP_NO_CONTENT
                                                        });
                                                    }
                                                    res({
                                                        message: "cache cleared for key " + target,
                                                        status: HTTP_OK
                                                    });
                                                });
                                            })];
                                    });
                                }); }), function (err) {
                                    if (err) {
                                        return resolve({ message: 'something went wrong' + err.message });
                                    }
                                    resolve({
                                        message: "cache cleared for the group key: " + target,
                                        status: HTTP_OK
                                    });
                                });
                            });
                        })];
                });
            });
        }
    };
};
var serviceClearAll = function (options) {
    if (options === void 0) { options = {}; }
    var redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
    return {
        setup: function (app, path) {
            this.app = app;
            this.path = path;
        },
        find: function () {
            return __awaiter(this, void 0, void 0, function () {
                var client;
                return __generator(this, function (_a) {
                    client = this.app.get(redisClient);
                    if (!client) {
                        return [2, {
                                message: 'Redis unavailable',
                                status: HTTP_SERVER_ERROR
                            }];
                    }
                    return [2, new Promise(function (resolve) {
                            client.flushdb(function () {
                                resolve({
                                    message: 'Cache cleared',
                                    status: HTTP_OK
                                });
                            });
                        })];
                });
            });
        }
    };
};
exports.default = (function (options) {
    if (options === void 0) { options = {}; }
    var pathPrefix = options.pathPrefix || '/cache';
    var redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
    return function () {
        var app = this;
        if (!DISABLE_REDIS_CACHE) {
            app.use(pathPrefix + "/clear/single", serviceClearSingle({ redisClient: redisClient }));
            app.use(pathPrefix + "/clear/group", serviceClearGroup({ redisClient: redisClient }));
            app.use(pathPrefix + "/clear/all", serviceClearAll({ redisClient: redisClient }));
        }
    };
});
//# sourceMappingURL=services.js.map