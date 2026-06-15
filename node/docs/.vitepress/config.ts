import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';

const require = createRequire(import.meta.url);
const typedocSidebar = require('../api/typedoc-sidebar.json');

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '.',
  base: '/sdk/node/',
  title: 'camera.ui Node SDK',
  description: 'TypeScript SDK for building camera.ui plugins',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', sizes: '32x32', href: '/sdk/node/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/x-icon', sizes: '16x16', href: '/sdk/node/favicon-16.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/sdk/node/apple-touch-icon.png' }],
    ['meta', { name: 'theme-color', content: '#df2a4c' }],
  ],
  themeConfig: {
    logo: '/logo.svg',

    // typedocSidebar entries are alphabetical:
    //   [0] camera, [1] manager, [2] observable, [3] plugin,
    //   [4] sensor, [5] storage, [6] types
    sidebar: [
      {
        text: 'Plugin API',
        items: typedocSidebar[3].items,
      },
      {
        text: 'Camera',
        items: typedocSidebar[0].items,
      },
      {
        text: 'Sensors',
        items: typedocSidebar[4].items,
      },
      {
        text: 'Storage & Schema',
        items: typedocSidebar[5].items,
      },
      {
        text: 'Manager',
        items: typedocSidebar[1].items,
      },
      {
        text: 'Observable',
        items: typedocSidebar[2].items,
      },
      {
        text: 'Types',
        items: typedocSidebar[6].items,
      },
      {
        text: 'Plugin Guide',
        link: '/examples/getting-started',
      },
    ],

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/seydx/camera.ui' },
      { icon: 'discord', link: 'https://discord.gg/bBGnGcbz8N' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M20 10.04a2.18 2.18 0 0 0-3.7-1.55a10.7 10.7 0 0 0-5.79-1.83l.99-4.65l3.23.69a1.55 1.55 0 1 0 .15-.74l-3.59-.76a.37.37 0 0 0-.44.28l-1.1 5.18a10.74 10.74 0 0 0-5.87 1.83a2.19 2.19 0 1 0-2.41 3.59a4 4 0 0 0-.05.66c0 3.36 3.91 6.09 8.74 6.09s8.74-2.73 8.74-6.09a4 4 0 0 0-.05-.66A2.19 2.19 0 0 0 20 10.04m-15 1.56a1.56 1.56 0 1 1 1.56 1.56A1.56 1.56 0 0 1 5 11.6m8.71 4.13c-1.07.81-2.39 1.21-3.71 1.16a5.85 5.85 0 0 1-3.71-1.16a.4.4 0 1 1 .55-.59A4.94 4.94 0 0 0 10 16.1a4.94 4.94 0 0 0 3.16-.96a.41.41 0 0 1 .57.04a.41.41 0 0 1-.02.55m-.16-2.55a1.56 1.56 0 1 1 1.56-1.56a1.56 1.56 0 0 1-1.55 1.56z"/></svg>',
        },
        link: 'https://www.reddit.com/r/cameraui/',
        ariaLabel: 'Reddit',
      },
    ],
  },
});
