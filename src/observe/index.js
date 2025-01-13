import { newArrayProto } from './array'
import Dep from './dep'

class Observe {
  constructor(data) {
    // 将自定义属性'__ob__'设置成不可枚举，否则在递归劫持过程会死循环
    Object.defineProperty(data, '__ob__', {
      value: this,
      enumerable: false,
    })
    // data.__ob__ = this; // 如果数据拥有__ob__属性，说明已经被代理过了
    if (Array.isArray(data)) {
      // 如果是数组，重写数组中可以修改数组的方法
      // 更改值是对象也可以被劫持监听
      data.__proto__ = newArrayProto
      this.observeArray(data)
    } else {
      this.walk(data)
    }
  }

  walk(data) {
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
  }

  observeArray(data) {
    data.forEach(item => observe(item))
  }
}

// 对属性做绑定劫持
export function defineReactive(target, key, value) {
  // 如果属性是队形，递归监听
  observe(value)
  let dep = new Dep()
  Object.defineProperty(target, key, {
    get() {
      if (Dep.target) {
        dep.depend() // 收集这个属性的watcher
      }

      return value
    },
    set(newValue) {
      if (value === newValue) return

      observe(value) // 如果赋的值是个对象，也需要做深层监听处理
      value = newValue
      dep.notify() // 通知更新
    },
  })
}

export function observe(data) {
  // 只对对象进行劫持
  if (typeof data !== 'object' || data === null) {
    return
  }

  // 如果属性实例上拥有__ob__，说明已经被劫持了，直接返回对应的实例
  if (data.__ob__ instanceof Observe) {
    return data.__ob__
  }

  return new Observe(data)
}
