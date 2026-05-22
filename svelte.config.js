import adapterStatic from '@sveltejs/adapter-static';
import adapterNode from '@sveltejs/adapter-node';

const target = process.env.MOKU_TARGET ?? 'static';

const adapter = target === 'node'
  ? adapterNode()
  : adapterStatic({ fallback: 'index.html' });

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    adapter,
    files: {
      assets: 'static',
    },
  },
};

export default config;