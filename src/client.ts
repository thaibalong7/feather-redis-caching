/* eslint-disable no-console */
import redis from 'redis';
import chalk from 'chalk';

const { DISABLE_REDIS_CACHE } = process.env;
const DEFAULT_REDIS_CLIENT = 'redisClient';
const DEFAULT_REDIS_CONFIG = 'default';

export default (options: any = {}) => {
  const errorLogger = options.errorLogger || console.error;
  const retryInterval = options.retryInterval || 5000;
  const redisClient = options.redisClient || DEFAULT_REDIS_CLIENT;
  const redisConfig = options.redisConfig || DEFAULT_REDIS_CONFIG;

  if (DISABLE_REDIS_CACHE) {
    return () => {};
  }

  return function client() {
    const app = this;
    const config = app.get('redis') || {};
    const configRedis = config[redisConfig] || config[DEFAULT_REDIS_CONFIG] || {};

    try {
      const redisOptions = {
        ...configRedis,
        retry_strategy: () => {
          app.set(redisClient, undefined);

          console.log(`${chalk.yellow('[redis]')} not connected`);

          return retryInterval;
        }
      };
      const client = redis.createClient(redisOptions);

      client.on('ready', () => {
        app.set(redisClient, client);

        console.log(`${chalk.green('[redis]')} connected '${redisClient}'`);
      });

      client.on('error', () => {
        app.set(redisClient, undefined);
        console.log(`${chalk.red('[redis]')} connect error '${redisClient}'`);
      });

    } catch (err) {
      errorLogger(err);
      app.set(redisClient, undefined);
    }

    return this;
  };
}
