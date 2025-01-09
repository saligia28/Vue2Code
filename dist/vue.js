(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  // 重写数组中的某些方法
  let oldArrayProto = Array.prototype;

  // 创建新的proto对象，避免修改影响原数组的原型链属性
  let newArrayProto = Object.create(oldArrayProto);
  let methods = ["push", "pop", "shift", "unshift", "reverse", "sort", "splice"];
  methods.forEach(method => {
    newArrayProto[method] = function (...arg) {
      const result = oldArrayProto[method].call(this, ...arg);
      let inserted; // 保存传入的修改值
      let ob = this.__ob__; // 获取Observe实例
      switch (method) {
        case "push":
        case "unshift":
          inserted = arg;
          break;
        case "splice":
          inserted = arg.slice(2);
      }
      if (inserted) {
        // 对新增的值继续劫持监听
        ob.observeArray(inserted);
      }
      return result;
    };
  });

  class Observe {
    constructor(data) {
      // 将自定义属性'__ob__'设置成不可枚举，否则在递归劫持过程会死循环
      Object.defineProperty(data, "__ob__", {
        value: this,
        enumerable: false
      });
      // data.__ob__ = this; // 如果数据拥有__ob__属性，说明已经被代理过了
      if (Array.isArray(data)) {
        // 如果是数组，重写数组中可以修改数组的方法
        // 更改值是对象也可以被劫持监听
        data.__proto__ = newArrayProto;
        this.observeArray(data);
      } else {
        this.walk(data);
      }
    }
    walk(data) {
      Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
    }
    observeArray(data) {
      data.forEach(item => observe(item));
    }
  }

  // 对属性做绑定劫持
  function defineReactive(target, key, value) {
    // 如果属性是队形，递归监听
    observe(value);
    Object.defineProperty(target, key, {
      get() {
        return value;
      },
      set(newValue) {
        if (value === newValue) return;
        observe(value); // 如果赋的值是个对象，也需要做深层监听处理
        value = newValue;
      }
    });
  }
  function observe(data) {
    // 只对对象进行劫持
    if (typeof data !== "object" || data === null) {
      return;
    }

    // 如果属性实例上拥有__ob__，说明已经被劫持了，直接返回对应的实例
    if (data.__ob__ instanceof Observe) {
      return data.__ob__;
    }
    return new Observe(data);
  }

  function initState(vm) {
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
      }
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

  function initMixin(Vue) {
    // 给Vue增加init方法
    Vue.prototype._init = function (options) {
      // vue vm.$options 获取用户自己的选项

      const vm = this; // 使用vm保留this
      vm.$options = options; // 将用户的选项挂载到实例上

      // 初始化状态
      initState(vm);
    };
  }

  function Vue(options) {
    // options就是用户的选项

    this._init(options);
  }
  initMixin(Vue);

  return Vue;

}));
//# sourceMappingURL=vue.js.map
