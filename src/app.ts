import Fastify from "fastify";
import AutoLoad from "@fastify/autoload";
import * as dotenv from "dotenv";
dotenv.config();
import { join } from "path";
import { initMQ } from "./mq";
const app = Fastify({ logger: true });
app.addHook("onReady", async () => {
  await initMQ();
  app.log.info("✅ MQ connected");
});

app.register(AutoLoad, {
  dir: join(__dirname, "routes"),
  options: { prefix: "/api" },
});

const port = Number(process.env.PORT || 3001);
const host = "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error("[error]" + err);
  // startConsumer();
  process.exit(1);
});
