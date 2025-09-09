import Fastify from "fastify";
import AutoLoad from "@fastify/autoload";
import * as dotenv from "dotenv";
dotenv.config();
import { join } from "path";
import { initMQ } from "./mq";
import fastifyStatic from "@fastify/static";

const app = Fastify({ logger: true });
app.register(fastifyStatic, {
  root: join(process.cwd(), "public"), // ใช้ process.cwd() ไม่ใช่ __dirname
  prefix: "/", // ให้เสิร์ฟจาก root
});
app.addHook("onReady", async () => {
  await initMQ();
  app.log.info("✅ MQ connected");
});
const LOADER_TOKEN = "fa0b65ad6385294aaf515297345fe46d";

app.get(`/loaderio-${LOADER_TOKEN}/`, async (req, reply) => {
  reply.type("text/plain").send(LOADER_TOKEN);
});

app.get(`/loaderio-${LOADER_TOKEN}.txt/`, async (req, reply) => {
  reply.type("text/plain").send(LOADER_TOKEN);
});
app.register(AutoLoad, {
  dir: join(__dirname, "routes"),
  options: { prefix: "/api" },
});

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error("[error]" + err);
  // startConsumer();
  process.exit(1);
});
