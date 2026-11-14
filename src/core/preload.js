/* Přednačtení s lištou, která nikdy necouvá.
   Seznam úloh se uzavře voláním run(): součet vah je od té chvíle pevný, takže procento může jen růst.
   Úloha přidaná později do lišty nepatří – zařadí se do fronty „v klidu“ (idle) a běží až po hlavních.
   Každá úloha má časový strop; chyba nebo vypršení se počítá jako hotovo, aby lišta nikdy nezůstala stát. */
export function createPreload() {
  const tasks = [],
    idle = [],
    subs = [];
  let total = 0,
    done = 0,
    shown = 0,
    closed = false,
    ready = false,
    readyP = null;
  const log = [];
  const emit = (label) => {
    const p = total ? Math.floor((100 * done) / total) : 100;
    shown = Math.max(shown, Math.min(ready ? 100 : 99, p)); /* 100 až po poslední úloze */
    if (ready) shown = 100;
    log.push(shown);
    for (const f of subs) f(shown, label, ready);
  };
  const guard = (fn, ms) =>
    new Promise((res) => {
      let fin = false;
      const end = () => {
        if (!fin) {
          fin = true;
          res();
        }
      };
      setTimeout(end, ms);
      try {
        Promise.resolve(fn()).then(end, end);
      } catch (e) {
        end();
      }
    });
  const P = {
    /* skupina 0 běží souběžně (stahování), vyšší skupiny po sobě (práce grafické karty) */
    add(label, weight, fn, group = 0, ms = 8000) {
      if (closed) {
        idle.push({ label, fn, ms });
        if (ready) P.runIdle();
        return false;
      }
      tasks.push({ label, weight, fn, group, ms });
      return true;
    },
    onProgress(f) {
      subs.push(f);
      f(shown, '', ready);
    },
    run() {
      if (readyP) return readyP;
      closed = true;
      total = tasks.reduce((s, t) => s + t.weight, 0);
      emit('');
      const groups = [...new Set(tasks.map((t) => t.group))].sort((a, b) => a - b);
      readyP = (async () => {
        for (const g of groups) {
          await Promise.all(
            tasks
              .filter((t) => t.group === g)
              .map((t) =>
                guard(t.fn, t.ms).then(() => {
                  done += t.weight;
                  emit(t.label);
                })
              )
          );
        }
        ready = true;
        emit('');
        P.runIdle();
      })();
      return readyP;
    },
    async runIdle() {
      while (idle.length) {
        const t = idle.shift();
        await guard(t.fn, t.ms);
        await new Promise((r) => setTimeout(r, 400));
      }
    },
    whenReady: (ms = 9000) => Promise.race([P.run(), new Promise((r) => setTimeout(r, ms))]),
    get ready() {
      return ready;
    },
    get pct() {
      return shown;
    },
    log,
  };
  return P;
}
