import type { FormEvent as ReactFormEvent } from "react";

declare global {
  namespace React {
    type FormEvent<T = Element> = ReactFormEvent<T>;
  }
}

export {};

// Production deployment trigger: Xingliu camera V2 is active on main.