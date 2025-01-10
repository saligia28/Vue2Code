import { compileToFunction } from "./compile";
import { mountComponent } from "./liftCycle";
import { initState } from "./state";

export function initMixin(Vue) {
  // 给Vue增加init方法
  Vue.prototype._init = function (options) {
    // vue vm.$options 获取用户自己的选项

    const vm = this; // 使用vm保留this
    vm.$options = options; // 将用户的选项挂载到实例上

    // 初始化状态
    initState(vm);

    if (options.el) {
      vm.$mount(options.el);
    }
  };

  Vue.prototype.$mount = function (el) {
    const vm = this;
    const options = vm.$options;

    el = document.querySelector(el);

    // 判断是否有模板语法
    if (!options.render) {
      // 先查找是否有render
      let template = options.template;
      if (!template && el) {
        template = el.outerHTML;
      }

      if (template && el) {
        const render = compileToFunction(template);
        options.render = render;
      }
    }

    mountComponent(vm, el);//组件的挂载
  };
}


// runtime 是不包含模板编译的，整个编译是打包的时候同构loader来转义.vue文件的，用runtime的时候不能使用template【Vue实例上】