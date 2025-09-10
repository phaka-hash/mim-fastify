import amqp, { ChannelModel, Channel } from "amqplib";
// import type { Channel, Connection } from "amqplib";

const RABBIT_URL =
  process.env.RABBIT_URL ||
  "amqps://ewekxlkz:V6zQGHylYs_vqa6QBXNrOzdh1xQMPkIk@armadillo.rmq.cloudamqp.com/ewekxlkz";

let connection!: ChannelModel;
let channel!: Channel;

export async function initMQ() {
  if (channel) return channel;

  connection = await amqp.connect(RABBIT_URL);
  channel = await connection.createChannel();

  return channel;
}

export async function publishToQueue(queue: string, msg: unknown) {
  if (!channel) await initMQ();
  // console.log(msg, channel);
  await channel.assertQueue(queue, { durable: true });
  channel!.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
    persistent: true,
    contentType: "application/json",
  });
}
