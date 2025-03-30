await Bun.build({
  entrypoints: [
    'index.ts',
    'extractors/base-extractor/index.ts',
    'extractors/github-extractor/index.ts'
  ],
  external: ['playwright'],
  outdir: './dist',
  target: 'node',
  minify: true,
  splitting: false,
  root: './',
});
