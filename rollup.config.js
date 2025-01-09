import babel from 'rollup-plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
export default {
  input: "./src/index.js",
  output: {
    file: "./dist/vue.js",
    name: "Vue",
    format: "umd", // esm es6 commonjs iife umd(commonjs  amd)
    sourcemap: true,
  },
  plugins: [
    babel({
        exclude: "node_modules/**" // 排除node_modules文件下的内容
    }),
    resolve()
  ]
};
