import { FastifyInstance } from "fastify";
import { Transaction, Customer } from "../types/mim";
import { publishToQueue } from "../mq";

export default async function MimRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: Transaction }>("/transactions", async (req, reply) => {
    const body = req.body;
    const pad = (n: number, w = 3) => n.toString().padStart(w, "0");
    body.Invoice_no = `T0909_${pad(
      Math.floor(Math.random() * 1000)
    )}_${Math.floor(Math.random() * 1000)}`;
    await publishToQueue("MIMDosetech", body);

    return reply.code(202).send({
      status: "queued",
      invoice: body.Invoice_no,
      body: body,
    });
  });
  fastify.post<{ Body: Customer }>("/customer", async (req, reply) => {
    const body = req.body;

    await publishToQueue("MIMDosetech", {
      ...body,
      MessageType: "CreateCustomer",
    });

    return reply.code(202).send({
      status: "queued",
      body: body,
    });
  });
}
