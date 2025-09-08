import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    return { hello: "world" };
  });
};

export default root;
