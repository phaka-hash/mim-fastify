import { FastifyInstance } from "fastify";
import { Transaction, Customer } from "../types/mim";
import { publishToQueue } from "../mq";

export default async function MimRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: Transaction }>("/transactions", async (req, reply) => {
    const body = req.body;
    const brand_code = req.body?.product?.[0].brand;
    // return reply.code(400).send({
    //   status: "no brand code",
    //   invoice: body.Invoice_no,
    //   brand_code: brand_code,
    //   body: body,
    // });
    if (!brand_code)
      return reply.code(400).send({
        result: "error",
        message: "Invalid brand code",
        body: body,
      });
    // const pad = (n: number, w = 3) => n.toString().padStart(w, "0");
    // body.Invoice_no = `T0909_${pad(
    //   Math.floor(Math.random() * 1000)
    // )}_${Math.floor(Math.random() * 1000)}`;
    await publishToQueue(brand_code, body);

    return reply.code(200).send({
      result: "ok",
      message: "queued",
      body: body,
    });
  });
  fastify.post<{ Body: Customer }>("/customer", async (req, reply) => {
    const body = req.body;
    const brand_code = body.brand;
    if (!brand_code)
      return reply.code(400).send({
        result: "error",
        message: "Invalid brand code",
        body: body,
      });
    await publishToQueue(brand_code, {
      ...body,
      MessageType: "CreateCustomer",
    });

    return reply
      .code(200)
      .send({ result: "ok", message: "queued", body: body });
  });
}
