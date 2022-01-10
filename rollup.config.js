import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'build/district-mapper.js',
    output: {
      file: 'build/district-mapper.bundle.js',
      format: 'esm'
    },
    plugins: [resolve(), terser()]
  };