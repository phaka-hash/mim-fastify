import { FastifyPluginAsync } from "fastify";
import { makeRandomCustomer } from "../mock";
const BASE =
  process.env.TARGET_BASE || "https://webhookmerge-production.up.railway.app";
const shallowClone = <T>(o: T): T => (o ? JSON.parse(JSON.stringify(o)) : o);
const pad = (n: number, w = 3) => n.toString().padStart(w, "0");
const headers = { "Content-Type": "application/json" };
type TargetKey = "customer" | "transaction";
const root: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    return { hello: "world" };
  });

  fastify.post<{ Body: any }>("/mock", async (req, reply) => {
    const body: any = req.body ?? {};
    const baseTrans = body?.transaction ?? body;
    const count: number = Number(body?.count ?? 1);
    const parallel: boolean = body?.parallel === false ? false : true;

    const rawTargets: unknown = body?.targets;
    const targets: TargetKey[] =
      Array.isArray(rawTargets) && rawTargets.length
        ? (rawTargets.filter(
            (t) => t === "customer" || t === "transaction"
          ) as TargetKey[])
        : (["customer", "transaction"] as TargetKey[]);

    const doCustomer = targets.includes("customer");
    const doTransaction = targets.includes("transaction");

    if (!doCustomer && !doTransaction) {
      reply.code(400);
      return {
        ok: false,
        error:
          'No valid targets. Use targets: ["customer"], ["transaction"], or ["customer","transaction"].',
        hint: { example: { targets: ["customer", "transaction"], count: 3 } },
      };
    }

    const postJson = (url: string, payload: any) =>
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload ?? {}),
      });

    const fireOnce = async (idx: number) => {
      const customerPayload = doCustomer ? makeRandomCustomer() : undefined;

      const transactionPayload = doTransaction
        ? shallowClone(baseTrans) || {}
        : undefined;
      if (transactionPayload) {
        transactionPayload.Invoice_no ??= `T0909_${pad(idx)}_${Math.floor(
          Math.random() * 1000
        )}`;
      }

      const jobs: {
        key: "customer" | "transactions";
        run: () => Promise<any>;
      }[] = [];
      if (doCustomer) {
        jobs.push({
          key: "customer",
          run: async () => {
            const res = await postJson(`${BASE}/api/customer`, customerPayload);
            try {
              return await res.json();
            } catch {
              throw new Error("Invalid JSON from /api/customer");
            }
          },
        });
      }
      if (doTransaction) {
        jobs.push({
          key: "transactions",
          run: async () => {
            const res = await postJson(
              `${BASE}/api/transactions`,
              transactionPayload
            );
            try {
              return await res.json();
            } catch {
              throw new Error("Invalid JSON from /api/transactions");
            }
          },
        });
      }

      const settled = await Promise.allSettled(jobs.map((j) => j.run()));

      const item: {
        ok: boolean;
        index: number;
        customer: any;
        transactions: any;
        errors: Record<string, string>;
        payloads: { customer?: any; transaction?: any };
        skipped: { customer: boolean; transactions: boolean };
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
        skipped: { customer: !doCustomer, transactions: !doTransaction },
      };

      settled.forEach((res, i) => {
        const key = jobs[i].key;
        if (res.status === "fulfilled") {
          (item as any)[key] = res.value;
        } else {
          item.ok = false;
          item.errors[key] = res.reason?.message || "Request failed";
        }
      });

      return item;
    };

    let results: Awaited<ReturnType<typeof fireOnce>>[] = [];

    if (parallel) {
      const tasks = Array.from({ length: Math.max(1, count) }, (_, i) =>
        fireOnce(i + 1)
      );
      results = await Promise.all(tasks);
    } else {
      for (let i = 1; i <= Math.max(1, count); i++) {
        results.push(await fireOnce(i));
      }
    }

    const allFail = results.every(
      (r) => (!doCustomer || !r.customer) && (!doTransaction || !r.transactions)
    );
    const someFail = results.some((r) => !r.ok);

    if (allFail) reply.code(502);
    else if (someFail) reply.code(207);

    return {
      ok: !someFail,
      targets,
      count: results.length,
      results,
    };
  });
};

export default root;
