import { observe } from "./observe/index.js";

export function initState(vm) {
  const opts = vm.$options; // 获取所有的选项

  if (opts.data) {
    initData(vm);
  }
}

function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key];
    },
    set(newValue) {
      vm[target][key] = newValue;
    },
  });
}

function initData(vm) {
  let data = vm.$options.data; // data可能是对象，也可能是函数

  data = typeof data === "function" ? data.call(vm) : data;

  vm._data = data;

  // 对数据进行劫持
  observe(data);
  for (let key in data) {
    proxy(vm, "_data", key);
  }
}
