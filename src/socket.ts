export type WSClient = { send: (data: string) => void };

class WsBus {
  private clients = new Set<WSClient>();
  add(c: WSClient) {
    this.clients.add(c);
  }
  remove(c: WSClient) {
    this.clients.delete(c);
  }
  broadcast(obj: unknown) {
    const data = JSON.stringify(obj);
    for (const c of this.clients) {
      try {
        c.send(data);
      } catch {}
    }
  }
}
export const wsBus = new WsBus();
