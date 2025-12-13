import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import config from "../config.js";

const redisStore = new KeyvRedis(config.redis_url);

export const redis = new Keyv({ store: redisStore });

redis.on("error", err => console.error("KEYV ERROR:", err));
