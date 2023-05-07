#!node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const argv = yargs(hideBin(process.argv))
  .version()
  .help()
  .options({
    data: {
      describe: 'Location of data directory.',
      type: 'string',
    },
  })
  .demandOption(['data']).argv;

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(entry);
    } else if (d.isFile()) {
      if (entry.endsWith('.json') && d.name !== 'index.json') {
        yield entry.split('.')[0];
      }
    }
  }
}

async function main() {
  try {
    const args = await argv;
    const metaDir = path.resolve(args.data, 'meta');
    const sceneryDir = path.resolve(args.data, 'scenery');

    // Generate metadata index
    const meta = [];
    for await (const p of walk(metaDir)) {
      // console.log(p);
      meta.push(path.relative(metaDir, p));
    }
    await fs.promises.writeFile(path.resolve(metaDir, 'index.json'), JSON.stringify(meta));

    // Generate scenery indices
    for await (const sDir of await fs.promises.opendir(sceneryDir)) {
      const structDir = path.join(sceneryDir, sDir.name);
      const structIndex = [];
      for await (const structFile of await fs.promises.opendir(structDir)) {
        const m = /^([pn])(\d+)-([pn])(\d+)\.msgpack$/.exec(structFile.name);
        if (m) {
          let x = parseInt(m[2]) * (m[1] === 'n' ? -1 : 1);
          let y = parseInt(m[4]) * (m[3] === 'n' ? -1 : 1);
          structIndex.push([x, y]);
        }
      }
      await fs.promises.writeFile(
        path.resolve(structDir, 'index.json'),
        JSON.stringify(structIndex)
      );
    }
  } catch (ex) {
    console.error(ex.message);
    console.log(ex.stack);
    process.exit(-1);
  }
}

main().then(() => process.exit(0));
