import Fastify from "fastify";
import AutoLoad from "@fastify/autoload";

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

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
