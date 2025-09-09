import * as amqp from "amqplib";
import "dotenv/config";
const url =
  process.env.RABBIT_URL ||
  "amqps://ewekxlkz:V6zQGHylYs_vqa6QBXNrOzdh1xQMPkIk@armadillo.rmq.cloudamqp.com/ewekxlkz";

async function main() {
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  const queues = ["MIMDosetech"];

  for (const queue of queues) {
    await ch.assertQueue(queue, { durable: true });
    console.log(url);
    console.log("👂 waiting on", queue);

    ch.consume(queue, (msg) => {
      if (!msg) return;
      const payload = msg.content.toString();
      console.log(`📩 [${queue}]`, payload);
      ch.ack(msg);
    });
  }
}

main().catch(console.error);
