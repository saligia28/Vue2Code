let id = 0

class Dep {
  //属性的dep要收集watcher
  constructor() {
    this.id = id++
    this.subs = []
  }
  depend() {
    // 收集依赖，去掉重复收集的watcher；同时也需要让watcher去依赖dep
    // this.subs.push(Dep.target)

    Dep.target.addDep(this)
  }
  addSub(watcher){
    this.subs.push(watcher)
  }
  notify(){
    this.subs.forEach(watcher => watcher.update()) // 通知更新
  }
}

Dep.target = null // 全局静态变量

export default Dep
