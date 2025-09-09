import { FastifyPluginAsync } from "fastify";
import { makeRandomCustomer } from "../mock";
const BASE =
  process.env.TARGET_BASE || "https://webhookmerge-production.up.railway.app";
const shallowClone = <T>(o: T): T => (o ? JSON.parse(JSON.stringify(o)) : o);
const pad = (n: number, w = 3) => n.toString().padStart(w, "0");
const headers = { "Content-Type": "application/json" };
const root: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    return { hello: "world" };
  });

  fastify.post<{ Body: any }>("/mock", async (req, reply) => {
    const body: any = req.body ?? {};
    const baseTrans = body?.transaction ?? body;
    const count: number = Number(body?.count ?? 1);
    const parallel: boolean = Boolean(body?.parallel ?? true);

    const fireOnce = async (idx: number) => {
      const customerPayload = makeRandomCustomer();

      const transactionPayload = shallowClone(baseTrans) || {};
      transactionPayload.Invoice_no = `T0909_${pad(idx)}_${Math.floor(
        Math.random() * 1000
      )}`;

      const [resCus, resTrans] = await Promise.allSettled([
        fetch(`${BASE}/api/customer`, {
          method: "POST",
          headers,
          body: JSON.stringify(customerPayload),
        }),
        fetch(`${BASE}/api/transactions`, {
          method: "POST",
          headers,
          body: JSON.stringify(transactionPayload),
        }),
      ]);

      const item: {
        ok: boolean;
        index: number;
        customer: any;
        transactions: any;
        errors: Record<string, string>;
        payloads: { customer: any; transaction: any };
      } = {
        ok: true,
        index: idx,
        customer: null,
        transactions: null,
        errors: {},
        payloads: {
          customer: customerPayload,
          transaction: transactionPayload,
        },
      };

      if (resCus.status === "fulfilled") {
        try {
          item.customer = await resCus.value.json();
        } catch {
          item.ok = false;
          item.errors.customer = "Invalid JSON from /api/customer";
        }
      } else {
        item.ok = false;
        item.errors.customer = resCus.reason?.message || "Request failed";
      }

      if (resTrans.status === "fulfilled") {
        try {
          item.transactions = await resTrans.value.json();
        } catch {
          item.ok = false;
          item.errors.transactions = "Invalid JSON from /api/transactions";
        }
      } else {
        item.ok = false;
        item.errors.transactions = resTrans.reason?.message || "Request failed";
      }

      return item;
    };

    let results: Awaited<ReturnType<typeof fireOnce>>[] = [];

    if (parallel) {
      const jobs = Array.from({ length: Math.max(1, count) }, (_, i) =>
        fireOnce(i + 1)
      );
      results = await Promise.all(jobs);
    } else {
      for (let i = 1; i <= Math.max(1, count); i++) {
        results.push(await fireOnce(i));
      }
    }

    const allFail = results.every((r) => !r.customer && !r.transactions);
    const someFail = results.some((r) => !r.ok);

    if (allFail) reply.code(502);
    else if (someFail) reply.code(207);

    return {
      ok: !someFail,
      count: results.length,
      results,
    };
  });
};

export default root;
