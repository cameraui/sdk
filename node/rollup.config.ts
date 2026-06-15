import { nodeResolve } from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';

import type { RollupOptions } from 'rollup';

const rollupOptions: RollupOptions[] = [
  {
    input: './src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      // @ts-ignore
      nodeResolve({
        extensions: ['.js', '.ts'],
        mainFields: ['exports', 'module', 'main'],
        exportConditions: ['node', 'import', 'default'],
      }),
      dts({
        respectExternal: true,
        tsconfig: './tsconfig.json',
      }),
    ],
    external: ['rxjs', 'debug', 'werift-rtp/src/rtcp/rtpfb/nack'],
  },
  {
    input: './src/internal/index.ts',
    output: [{ file: 'dist/internal/index.d.ts', format: 'esm' }],
    plugins: [
      // @ts-ignore
      nodeResolve({
        extensions: ['.js', '.ts'],
        mainFields: ['exports', 'module', 'main'],
        exportConditions: ['node', 'import', 'default'],
      }),
      dts({
        respectExternal: true,
        tsconfig: './tsconfig.json',
      }),
      // Strip the duplicated `declare class Disposable {...}` that rollup-dts inlines and
      // redirect references to the public bundle so Disposable has a single identity.
      {
        name: 'replace-duplicate-disposable',
        generateBundle(_options, bundle) {
          for (const file of Object.values(bundle)) {
            const src = file.type === 'chunk' ? (file as any).code : (file as any).source;
            if (!file.fileName.endsWith('.d.ts') || typeof src !== 'string') continue;
            const stripped = src.replace(/declare class Disposable \{[\s\S]*?\n\}\n/, '');
            if (stripped !== src) {
              const next = "import type { Disposable } from '@camera.ui/sdk';\n" + stripped;
              if (file.type === 'chunk') {
                (file as any).code = next;
              } else {
                (file as any).source = next;
              }
            }
          }
        },
      },
    ],
    external: ['rxjs', 'debug', 'werift-rtp/src/rtcp/rtpfb/nack'],
  },
];

export default rollupOptions;
