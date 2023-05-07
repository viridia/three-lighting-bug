import { createSignal } from 'solid-js';

/** Which log channels are currently enabled. */
type LogChannels = Record<string, boolean>;
type LoggerFn = (first: string | (() => string) | undefined, ...rest: any[]) => void;
export type Logger = LoggerFn & { enabled: boolean };

const enabled: LogChannels = {};
const [trackEnabledChanged, setEnabledChanged] = createSignal<void>();

function createChannel(key: string, initialState = false) {
  if (!(key in enabled)) {
    const [isEnabled, setEnabled] = createSignal(initialState);
    Reflect.defineProperty(enabled, key, {
      enumerable: true,
      get: isEnabled,
      set: newState => {
        setEnabled(newState);
      },
    });
    setEnabledChanged();
  }
}

export function createLogger(channel: string | string[], color = '', prefix = ''): Logger {
  if (prefix) {
    prefix = `[${prefix}] `;
  }
  const keys = Array.isArray(channel) ? channel : [channel];
  const logger = (first: string | (() => string), ...rest: any[]) => {
    if (keys.some(key => enabled[key])) {
      if (typeof first === 'function') {
        first = first();
      }
      if (color) {
        queueMicrotask(
          console.log.bind(console, `%c${prefix}${first}`, `color: ${color}`, ...rest)
        );
      } else {
        queueMicrotask(console.log.bind(console, `${prefix}${first}`, ...rest));
      }
    }
  };
  keys.forEach(key => {
    if (!(key in enabled)) {
      createChannel(key, false);
    }
  });
  Reflect.defineProperty(logger, 'enabled', {
    get: () => keys.some(key => enabled[key]),
  });
  return logger as Logger;
}

export function initLogging() {
  try {
    const saved = JSON.parse(globalThis.localStorage.getItem('log-channels') || '{}');
    if (typeof saved === 'object') {
      Object.keys(saved).forEach(key => {
        const value = saved[key];
        if (value === true) {
          createChannel(key, value);
          enabled[key] = value;
        }
      });
    }

    queueMicrotask(
      console.log.bind(
        console,
        `%cLog channels enabled: [${Object.keys(enabled)
          .filter(key => enabled[key as keyof LogChannels])
          .sort()
          .join(', ')}]`,
        'color: #f8f'
      )
    );
    globalThis.addEventListener('beforeunload', () => {
      globalThis.localStorage.setItem('log-channels', JSON.stringify(enabled));
    });
  } catch (e) {
    // Ignore.
  }
}

export function getLogChannels(): LogChannels {
  trackEnabledChanged();
  return enabled;
}

(globalThis as any).logChannels = enabled;
