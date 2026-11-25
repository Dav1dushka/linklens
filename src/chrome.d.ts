/**
 * The few extension APIs LinkLens uses. Declared here instead of pulling in
 * @types/chrome, so the project stays dependency-light and the surface it
 * relies on is obvious.
 */
declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined;
    const onMessage: {
      addListener(cb: (msg: any, sender: unknown, reply: (response?: unknown) => void) => boolean | void): void;
    };
  }
  namespace storage {
    const sync: {
      get(defaults: Record<string, unknown>, cb: (items: Record<string, any>) => void): void;
      set(items: Record<string, unknown>): void;
    };
  }
  namespace tabs {
    interface Tab { id?: number; url?: string }
    function query(q: { active: boolean; currentWindow: boolean }, cb: (tabs: Tab[]) => void): void;
    function sendMessage(tabId: number, msg: unknown, cb?: (response: any) => void): void;
  }
}
