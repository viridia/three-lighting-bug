import { features } from '../config';

type ModuleIndex = Record<string, () => Promise<unknown>>;

export interface IScriptCatalog {
  prefix: string;
  modules: ModuleIndex;
}

const scriptCatalogs: Record<string, IScriptCatalog> = {};

export function addScriptCatalog(name: string, prefix: string, srcModules: ModuleIndex) {
  const modules: ModuleIndex = {};
  for (const fileName in srcModules) {
    let modName = fileName;
    if (modName.endsWith('.d.ts') || modName.endsWith('.d.tsx')) {
      continue;
    }
    if (modName.endsWith('.ts') || modName.endsWith('.js')) {
      modName = modName.slice(0, -3);
    } else if (modName.endsWith('.tsx') || modName.endsWith('.jsx')) {
      modName = modName.slice(0, -4);
    }
    modules[modName] = srcModules[fileName];
  }
  scriptCatalogs[name] = { prefix, modules };
}

export function getScriptCatalog(name: string): IScriptCatalog {
  if (!scriptCatalogs[name]) {
    console.error(
      `Unknown script catalog: ${name}. Valid catalogs are:`,
      Reflect.ownKeys(scriptCatalogs)
    );
    throw new Error(`Unknown script catalog: ${name}`);
  }
  return scriptCatalogs[name];
}

export function getScriptModules(catalogName: string): string[] {
  const catalog = getScriptCatalog(catalogName);
  return Object.keys(catalog.modules).map(name => {
    if (name.startsWith(catalog.prefix)) {
      name = name.slice(catalog.prefix.length);
    }
    if (name.endsWith('.ts')) {
      name = name.slice(0, name.length - 3);
    } else if (name.endsWith('.tsx')) {
      name = name.slice(0, name.length - 4);
    }
    return name;
  });
}

export async function maybeGetScriptModule(
  catalogName: string,
  scriptPath: string
): Promise<{ [key: string]: any } | null> {
  const catalog = getScriptCatalog(catalogName);
  let filePromise = catalog.modules[`${catalog.prefix}${scriptPath}`];
  if (!filePromise) {
    // filePromise = catalog.modules[`${catalog.prefix}${scriptPath}.tsx`];
    // if (!filePromise) {
    return null;
    // }
  }

  return (await filePromise()) as Record<string, any>;
}

export async function getScriptModule(
  catalogName: string,
  scriptPath: string
): Promise<{ [key: string]: any }> {
  const catalog = getScriptCatalog(catalogName);
  const filePath = `${catalog.prefix}${scriptPath}`;
  let filePromise = catalog.modules[filePath];
  if (!filePromise) {
    console.error(`Invalid script module: ${filePath}`);
    console.warn('Valid modules are:', Reflect.ownKeys(catalog.modules));
    throw new Error(`Invalid script module: ${filePath}`);
  }

  return (await filePromise()) as Record<string, any>;
}

export async function getScript<T extends any>(
  catalogName: string,
  scriptPath: string
): Promise<T | undefined> {
  if (!features.loadScripts) {
    return undefined;
  }
  const catalog = getScriptCatalog(catalogName);
  const [modName, exportName] = scriptPath.split(':', 2);
  if (modName && exportName) {
    const filePath = `${catalog.prefix}${modName}`;
    let filePromise = catalog.modules[filePath];
    if (!filePromise) {
      console.error(`Invalid script module: ${filePath}`);
      console.warn('Valid modules are:', Reflect.ownKeys(catalog.modules));
      throw new Error(`Invalid script module: ${filePath}`);
    }

    const module = await filePromise();
    if (!exportName) {
      console.warn(`Script entry not found: ${scriptPath}`);
    } else {
      return (module as Record<string, any>)[exportName];
    }
  } else {
    console.warn(`Invalid script id format: ${scriptPath}`);
  }
}
