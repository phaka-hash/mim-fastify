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
    const baseTrans = body?.transaction ?? body; // พื้นฐานสำหรับ transaction (ถ้า user ส่งมา)
    const count: number = Number(body?.count ?? 1);
    const parallel: boolean = body?.parallel === false ? false : true;

    // ---- กำหนดว่าจะยิงอะไรบ้าง ----
    const only: string | undefined = body?.only; // 'customer' | 'transaction' | 'both'
    const targets: any = Array.isArray(body?.targets)
      ? body.targets
      : undefined;
    let doCustomer: boolean;
    let doTransaction: boolean;

    if (only === "customer") {
      doCustomer = true;
      doTransaction = false;
    } else if (only === "transaction") {
      doCustomer = false;
      doTransaction = true;
    } else if (only === "both" || only == null) {
      if (targets) {
        doCustomer = targets.includes("customer");
        doTransaction = targets.includes("transaction");
      } else {
        // รองรับ flag เก่า/ง่าย
        const sc = body?.sendCustomer;
        const st = body?.sendTransaction;
        doCustomer = sc !== undefined ? Boolean(sc) : true;
        doTransaction = st !== undefined ? Boolean(st) : true;
      }
    } else {
      // only อื่นๆ ถือว่า both
      doCustomer = true;
      doTransaction = true;
    }

    if (!doCustomer && !doTransaction) {
      reply.code(400);
      return {
        ok: false,
        error:
          "No target selected. Set only/targets or sendCustomer/sendTransaction.",
        hint: {
          examples: [
            { only: "customer" },
            { only: "transaction" },
            { targets: ["customer", "transaction"] },
            { sendCustomer: true, sendTransaction: false },
          ],
        },
      };
    }

    const postJson = (url: string, payload: any) =>
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload ?? {}),
      });

    const fireOnce = async (idx: number) => {
      // เตรียม payload ตาม target
      const customerPayload = doCustomer ? makeRandomCustomer() : undefined;

      const transactionPayload = doTransaction
        ? shallowClone(baseTrans) || {}
        : undefined;
      if (transactionPayload) {
        transactionPayload.Invoice_no = `T0909_${pad(idx)}_${Math.floor(
          Math.random() * 1000
        )}`;
      }

      // จัดจ๊อบตามที่เลือก
      const jobs: {
        key: "customer" | "transactions";
        promise: Promise<Response>;
      }[] = [];
      if (doCustomer) {
        jobs.push({
          key: "customer",
          promise: postJson(`${BASE}/api/customer`, customerPayload),
        });
      }
      if (doTransaction) {
        jobs.push({
          key: "transactions",
          promise: postJson(`${BASE}/api/transactions`, transactionPayload),
        });
      }

      const settled = await Promise.allSettled(jobs.map((j) => j.promise));

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

      // map กลับเข้า field ให้ถูก key
      settled.forEach((res, i) => {
        const key = jobs[i].key; // 'customer' | 'transactions'
        if (res.status === "fulfilled") {
          (async () => {
            try {
              const data = await res.value.json();
              (item as any)[key] = data;
            } catch {
              item.ok = false;
              item.errors[key] = `Invalid JSON from /api/${key}`;
            }
          }) as unknown;
        } else {
          item.ok = false;
          item.errors[key] = res.reason?.message || "Request failed";
        }
      });

      // ต้องรอให้ทุก async json() เสร็จ
      await Promise.all(
        settled.map(async (res, i) => {
          const key = jobs[i].key;
          if (res.status === "fulfilled") {
            try {
              const data = await res.value.json();
              (item as any)[key] = data;
            } catch {
              item.ok = false;
              item.errors[key] = `Invalid JSON from /api/${key}`;
            }
          }
        })
      );

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
      targets: { customer: doCustomer, transaction: doTransaction },
      count: results.length,
      results,
    };
  });
};

export default root;
