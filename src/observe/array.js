// 重写数组中的某些方法
let oldArrayProto = Array.prototype;

// 创建新的proto对象，避免修改影响原数组的原型链属性
export let newArrayProto = Object.create(oldArrayProto);

let methods = ["push", "pop", "shift", "unshift", "reverse", "sort", "splice"];

methods.forEach((method) => {
  newArrayProto[method] = function (...arg) {
    const result = oldArrayProto[method].call(this, ...arg);

    let inserted; // 保存传入的修改值
    let ob = this.__ob__; //获取Observe实例
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
