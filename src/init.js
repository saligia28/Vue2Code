import { initState } from "./state";

export function initMixin(Vue) {
  // 给Vue增加init方法
  Vue.prototype._init = function (options) {
    // vue vm.$options 获取用户自己的选项

    const vm = this; // 使用vm保留this
    vm.$options = options; // 将用户的选项挂载到实例上

    // 初始化状态
    initState(vm);
  };
}

