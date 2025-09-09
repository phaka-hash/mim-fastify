import { FastifyInstance } from "fastify";
import { Transaction, Customer } from "../types/mim";
import { publishToQueue } from "../mq";

export default async function MimRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: Transaction }>("/transactions", async (req, reply) => {
    const body = req.body;

    await publishToQueue("transactions", body);

    return reply.code(202).send({
      status: "queued",
      invoice: body.Invoice_no,
      body: body,
    });
  });
  fastify.post<{ Body: Customer }>("/customer", async (req, reply) => {
    const body = req.body;

    await publishToQueue("transactions", {
      ...body,
      MessageType: "CreateCustomer",
    });

    return reply.code(202).send({
      status: "queued",
      body: body,
    });
  });
}
