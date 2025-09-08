import * as amqp from "amqplib";
import { wsBus } from "./socket";
const url =
  process.env.RABBIT_URL ||
  "amqps://ewekxlkz:V6zQGHylYs_vqa6QBXNrOzdh1xQMPkIk@armadillo.rmq.cloudamqp.com/ewekxlkz";

async function main() {
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();

  const queues = ["transactions", "mimCustomer"];

  for (const queue of queues) {
    await ch.assertQueue(queue, { durable: true });

    console.log("👂 waiting on", queue);

    ch.consume(queue, (msg) => {
      if (!msg) return;
      const payload = msg.content.toString();
      console.log(`📩 [${queue}]`, msg.content.toString());
      wsBus.broadcast({ queue, payload, ts: Date.now() });
      ch.ack(msg);
    });
  }
}

main().catch(console.error);
