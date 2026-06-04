import adapterStatic from '@sveltejs/adapter-static';
import adapterNode from '@sveltejs/adapter-node';

const target = process.env.MOKU_TARGET ?? 'static';

const adapter = target === 'node'
  ? adapterNode()
  : adapterStatic({ fallback: 'index.html', pages: 'dist', assets: 'dist' })

const config = {
  compilerOptions: {
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    adapter,
    paths: {
      relative: true,
    },
    files: {
      assets: 'static',
    },
  },
};

export default config;