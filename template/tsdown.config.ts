/**
 * Bundles the declarations tsc already emitted to lib/types into the
 * runtime lib/ output. Run `tsc -b` first (the package.json `build` script
 * does this: `tsc -b && tsdown`).
 */
export default {
  entry: { index: 'lib/types/index.js' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}
