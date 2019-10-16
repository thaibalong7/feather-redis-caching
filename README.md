[![License](https://img.shields.io/npm/l/feathers-redis-cache.svg)](https://www.npmjs.com/package/feathers-redis-caching)
<!-- [![NPM](https://img.shields.io/npm/v/feathers-redis-cache.svg)](https://www.npmjs.com/package/feathers-redis-cache) -->
..
##### This repository is a fork of [feathers-redis-cache](https://github.com/sarkistlt/feathers-redis-cache), with the following changes:
- allow configure multi redis server by the way customize params of each function.
- limit time to request to server Redis in hooks. If request timeout, skip the hook and go to the service.
- option to pass custom `redisClient` in configure service Cache clean, to customize name of key of redis client for use.
- option to pass custom `redisClient` in configure Redis Client, that name of key of redis client.
- option to pass custom `redisConfig` in configure Redis Client, thay key of config Redis server.
- option to pass custom `redisClient` in every hook, to specify redis client name to save cache.

### Installation

<!-- ```
  yarn add feathers-redis-cache
```     -->
```
  npm install feathers-redis-caching
```    

## Purpose
The purpose of these hooks is to provide redis caching for APIs endpoints. Using redis is a very good option for clustering your API. As soon as a request is cached it is available to all the other nodes in the cluster, which is not true for usual in memory cache as each node has its own memory allocated. This means that each node has to cache all requests individually.

Each request to an endpoint can be cached. Route variables and params are cached on a per request base. If a param to call is set to true and then to false two responses will be cached.

The cache can be purged for an individual route, but also for a group of routes. This is very useful if you have an API endpoint that creates a list of articles, and an endpoint that returns an individual article. If the article is modified, the list of articles should, most likely, be purged as well. This can be done by calling one endpoint.

### Routes examples
In the same fashion if you have many variants of the same endpoint that return similar content based on parameters you can bust the whole group as well:

```js
'/articles' // list
'/articles/article' //individual item
'/articles/article?markdown=true' // variant
```
#### Clearing cache
These are all listed in a redis list under `group-articles` and can be busted by calling `/cache/clear/group/articles`. All urls keys will be purged.

You can also purge single cached paths as by doing GET requests on 
```js
'/cache/clear/single/articles'
'/cache/clear/single/articles/article'
'/cache/clear/single/articles/article?markdown=true' // works with query strings too
```

or purge all by calling `/cache/clear/all`

It was meant to be used over **_HTTP_**, not yet tested with sockets.

### Configuration
#### Redis
To configure the redis connection the feathers configuration system can be used.
```js
//config/default.json
{
  "host": "localhost",
  "port": 3030,
  "redis": {
      "default": {
        "host": "my-redis-service.example.com",
        "port": 6379
      },
      "local": {
        "host": "127.0.0.1",
        "port": 6379
      }
  }
}
```
* if no config is provided, default config from the [redis module](https://github.com/NodeRedis/node_redis) is used

## Available hooks
More details and example use bellow

* `hooks.before(options)` - retrieves the data from redis
* `hooks.after(options)` - cache the data to redis
* `hooks.purge(options)` - purge cache from redis

#### options properties (all props are optional)

##### redisClient: `string`
Name of redis client that want to save cache. The default is `redisClient`. When hook is running, it find redis client that configure when with name is `redisClient` and save cache.

##### cacheKey(context: `feathers-context`): `string`
In case if you want to use custom function to modify key name, you need to pass the same function in before and after hooks.

##### expiration: `number`
Time in seconds when to expire the key, this option need to be passed in after hook, if you won't pass it, default value of 1 day will be used.

##### env: `string`
The default environment is production, but it is annoying when running test as the hooks output information to the console. Therefore if you use this option, you can set `test` as an environment and the hooks will not output anything to the console. This is useful for CI or CLI.

Available routes:
```js
'/cache/clear/all' // clears the whole cache
'/cache/clear/single/:target' // clears a single route if you want to purge a route with params just adds them target?param=1
'/cache/clear/group/:target' // clears a group
```

## Complete Example

Here's an example of a Feathers server that uses `feathers-redis-cache`.
Make sure that the client func and service have the same `redisClient` params

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const redisCache = require('feathers-redis-cache');

const redisClient = 'redisClient';
const redisConfig = 'default';

// Initialize the application
const app = feathers()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .configure(rest())
  .configure(hooks())
  // errorLogger is function for logging errors
  // if not passed console.error will bbe used
  .configure(redisCache.client({ errorLogger: logger.error, redisConfig, redisClient }))
  // you can change cache path prefix by passing `pathPrefix` option
  // if not passed default prefix '/cache' will be used
  .configure(redisCache.services({ pathPrefix: '/cache' , redisClient}))
  .use(errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

Add hooks on the routes that need caching
```js
//services/<service>.hooks.js

const redisCache = require('feathers-redis-cache');

// name of redis client that you configure in app.js
const redisClient = 'redisClient';

module.exports = {
  before: {
    all: [],
    find: [redisCache.before({ redisClient })],
    get: [redisCache.before({ redisClient })],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [redisCache.after({ expiration: 3600 * 24 * 7, redisClient })],
    get: [redisCache.after({ expiration: 3600 * 24 * 7, redisClient })],
    create: [redisCache.purge({ redisClient })],
    update: [redisCache.purge({ redisClient })],
    patch: [redisCache.purge({ redisClient })],
    remove: [redisCache.purge({ redisClient })]
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
```

You can also skip cache hook by passing `hook.params.$skipCacheHook = true`
You can also disable redis-cache hooks and service by passing env. variable `DISABLE_REDIS_CACHE=true`

## TODO:
- TS definitions
- test cases
- option in after hook to set limit of keys per group
## License

Copyright (c) 2019

Licensed under the [MIT license](LICENSE).

