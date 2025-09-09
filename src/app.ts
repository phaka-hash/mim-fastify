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
const LOADER_TOKEN = "fa0b65ad6385294aaf515297345fe46d";

// แบบไม่มี .txt (นิยมใช้)
app.get(`/loaderio-${LOADER_TOKEN}`, async (req, reply) => {
  reply.type("text/plain").send(LOADER_TOKEN);
});

// เผื่อกรณีที่ Loader.io ขอแบบ .txt
app.get(`/loaderio-${LOADER_TOKEN}.txt`, async (req, reply) => {
  reply.type("text/plain").send(LOADER_TOKEN);
});
app.register(AutoLoad, {
  dir: join(__dirname, "routes"),
  options: { prefix: "/api" },
});

const port = Number(process.env.PORT || 3002);
const host = "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error("[error]" + err);
  // startConsumer();
  process.exit(1);
});
