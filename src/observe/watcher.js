import Dep from './dep'

let id = 0 // 做唯一标识

// 观察者模式
class Watcher {
  //不同组件有不同的watcher
  constructor(vm, fn, option) {
    this.id = id++
    this.renderWatcher = option //是否是渲染watcher
    this.getter = fn
    this.deps = [] // 后续实现计算属性，和一些清理工作需要用到
    this.depIds = new Set()
    this.get()
  }

  get() {
    Dep.target = this // 静态属性，只有这一个
    this.getter() // 触发取值操作
    Dep.target = null
  }

  addDep(dep) {
    let id = dep.id
    if (!this.depIds.has(id)) {
      // 去重收集dep
      this.deps.push(dep)
      this.depIds.add(id)
      dep.addSub(this)
    }
  }

  update() {
    this.get() // 触发更新，渲染试图
  }
}

// 需要给每个属性增加一个dep，目的就是为了收集watcher -->类似于将用到属性的视图watcher收集起来
// 一个属性 对应多个视图  一个视图中也可以有多个属性，多对多

export default Watcher
