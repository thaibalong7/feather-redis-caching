/* eslint-disable no-console */
import moment from 'moment/moment';
import chalk from 'chalk';
import qs from 'qs';
import async from 'async';

const { DISABLE_REDIS_CACHE, ENABLE_REDIS_CACHE_LOGGER } = process.env;
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_SERVER_ERROR = 500;
const defaults = {
  defaultExpiration: 3600 * 24
};
const DEFAULT_REDIS_CLIENT = 'redisClient';


function cacheKey(hook) {
  const q = hook.params.query || {};
  const p = hook.params.paginate === false ? 'disabled' : 'enabled';
  let path = `pagination-hook:${p}::${hook.path}`;

  if (hook.id) {
    path += `/${hook.id}`;
  }

  if (Object.keys(q).length > 0) {
    path += `?${qs.stringify(JSON.parse(JSON.stringify(q)), { encode: false, arrayFormat: 'comma' })}`;
  }

  return path;
}

async function setKeyRedis(client, options, { path, cache, expiresOn, group, duration }) {
  client.set(path, JSON.stringify({
    cache,
    expiresOn,
    group,
  }));
  client.expire(path, duration);
  client.rpush(group, path);

  if (options.env !== 'test' && ENABLE_REDIS_CACHE_LOGGER === 'true') {
    console.log(`${chalk.cyan('[redis]')} added ${chalk.green(path)} to the cache.`);
    console.log(`> Expires in ${moment.duration(duration, 'seconds').humanize()}.`);
  }
}

export default {
  before(passedOptions) {
    if (DISABLE_REDIS_CACHE) {
      return hook => hook;
    }

    return function (hook) {
      try {
        if (hook && hook.params && hook.params.$skipCacheHook) {
          return Promise.resolve(hook);
        }

        return new Promise(resolve => {
          const options = { ...defaults, ...passedOptions };
          const redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
          const client = hook.app.get(redisClient);
          if (!client) {
            return resolve(hook);
          }

          const path = typeof options.cacheKey === 'function' ?
            options.cacheKey(hook) :
            cacheKey(hook);

          hook.params.cacheKey = path;

          client.get(path, (err, reply) => {
            if (err) {
              return resolve(hook);
            }

            if (reply) {
              const data = JSON.parse(reply);

              if (!data || !data.expiresOn || !data.cache) {
                return resolve(hook);
              }

              const duration = moment(data.expiresOn).format('DD MMMM YYYY - HH:mm:ss');

              hook.result = data.cache;
              hook.params.$skipCacheHook = true;

              if (options.env !== 'test' && ENABLE_REDIS_CACHE_LOGGER === 'true') {
                console.log(`${chalk.cyan('[redis]')} returning cached value for ${chalk.green(path)}.`);
                console.log(`> Expires on ${duration}.`);
              }

              return resolve(hook);
            }

            return resolve(hook);
          });
        });
      } catch (err) {
        console.error(err);
        return Promise.resolve(hook);
      }
    };
  },
  after(passedOptions) {
    if (DISABLE_REDIS_CACHE) {
      return hook => hook;
    }

    return function (hook) {
      try {
        if (
          hook
          && hook.params
          && hook.params.$skipCacheHook
        ) {
          return Promise.resolve(hook);
        }

        if (!hook.result) {
          return Promise.resolve(hook);
        }

        return new Promise((resolve) => {
          const options = { ...defaults, ...passedOptions };

          const redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
          const client = hook.app.get(redisClient);

          const duration = options.expiration || options.defaultExpiration;
          const { cacheKey: path } = hook.params;
          const group = hook.path ? `group-${hook.path}` : '';

          if (!client) {
            return resolve(hook);
          }

          setKeyRedis(client, options, {
            path,
            cache: hook.result,
            expiresOn: moment().add(moment.duration(duration, 'seconds')),
            group,
            duration
          })

          resolve(hook);
        });
      } catch (err) {
        console.error(err);
        return Promise.resolve(hook);
      }
    };
  },
  purge(passedOptions) {
    if (DISABLE_REDIS_CACHE) {
      return hook => hook;
    }

    return function (hook) {
      try {
        if (
          hook
          && hook.params
          && hook.params.$skipCacheHook
        ) {
          return Promise.resolve(hook);
        }

        return new Promise((resolve) => {
          const redisClient = passedOptions.redisClient || DEFAULT_REDIS_CLIENT;
          const client = hook.app.get(redisClient);
          const target = hook.path;

          if (!client) {
            // return {
            //   message: 'Redis unavailable',
            //   status: HTTP_SERVER_ERROR
            // };
            return resolve(hook);
          }

          client.lrange(`group-${target}`, 0, -1, (err, reply) => {
            if (err) {
              return resolve(hook);
            }

            if (!reply || !Array.isArray(reply) || reply.length <= 0) {
              return resolve(hook);
            }

            async.eachOfLimit(reply, 10, async.asyncify(async (key) => {
              return new Promise((res) => {
                client.del(key, (err, reply) => {
                  if (err) {
                    return res({ message: 'something went wrong' + err.message });
                  }

                  if (!reply) {
                    return res({
                      message: `cache already cleared for key ${target}`,
                      status: HTTP_NO_CONTENT
                    });
                  }

                  res({
                    message: `cache cleared for key ${target}`,
                    status: HTTP_OK
                  });
                });
              });
            }), () => resolve(hook));
          });
        });
      } catch (err) {
        console.error(err);
        return Promise.resolve(hook);
      }
    };
  },
};
