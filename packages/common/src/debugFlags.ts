import { createSignal, Setter, Signal } from 'solid-js';

/** Which log channels are currently enabled. */
type DebugFlags = Record<string, boolean>;

const debugflags: DebugFlags = {};
const [trackEnabledChanged, setEnabledChanged] = createSignal<void>();

export function createDebugFlag(key: string, initialState = false): Signal<boolean> {
  if (!(key in debugflags)) {
    const [isEnabled, setEnabled] = createSignal(initialState);
    Reflect.defineProperty(debugflags, key, {
      enumerable: true,
      get: isEnabled,
      set: setEnabled,
    });
    setEnabledChanged();
    return [isEnabled, setEnabled];
  } else {
    const descriptor = Reflect.getOwnPropertyDescriptor(debugflags, key);
    return [descriptor!.get!, descriptor!.set! as Setter<boolean>];
  }
}

export function initDebugFlags() {
  try {
    const saved = JSON.parse(globalThis.localStorage.getItem('debug-flags') || '{}');
    if (typeof saved === 'object') {
      Object.keys(saved).forEach(key => {
        const value = saved[key];
        if (value === true) {
          createDebugFlag(key, value);
          debugflags[key] = value;
        }
      });
    }

    queueMicrotask(
      console.log.bind(
        console,
        `%cDebug flags: [${Object.keys(debugflags)
          .filter(key => debugflags[key as keyof DebugFlags])
          .sort()
          .join(', ')}]`,
        'color: #8cf'
      )
    );
    globalThis.addEventListener('beforeunload', () => {
      globalThis.localStorage.setItem('debug-flags', JSON.stringify(debugflags));
    });
  } catch (e) {
    // Ignore.
  }
}

export function getDebugFlags(): DebugFlags {
  trackEnabledChanged();
  return debugflags;
}

export function isDebugEnabled(key: string): boolean {
  trackEnabledChanged();
  return Boolean(debugflags[key]);
}

(globalThis as any).debugFlags = debugflags;
