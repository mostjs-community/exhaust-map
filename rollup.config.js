import typescript from 'rollup-plugin-typescript2'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    sourceMap: true,
    format: 'umd',
  },
  external: [
    '@most/disposable',
    '@most/prelude',
    '@most/scheduler'
  ],
  plugins: [
    typescript(),
    resolve(),
  ]
}
