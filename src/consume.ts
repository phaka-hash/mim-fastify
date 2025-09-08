import * as amqp from "amqplib";
import { wsBus } from "./socket";

const url =
  process.env.RABBIT_URL ||
  "amqps://ewekxlkz:V6zQGHylYs_vqa6QBXNrOzdh1xQMPkIk@armadillo.rmq.cloudamqp.com/ewekxlkz";

export async function startConsumer() {
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  const queues = ["transactions", "mimCustomer"];

  for (const q of queues) {
    await ch.assertQueue(q, { durable: true });
    console.log("👂 waiting on", q);

    ch.consume(q, (msg) => {
      if (!msg) return;
      const payload = msg.content.toString();
      console.log(payload);
      wsBus.broadcast({ queue: q, payload, ts: Date.now() });
      ch.ack(msg);
    });
  }
}
