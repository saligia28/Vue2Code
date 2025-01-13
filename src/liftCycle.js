/**
 * 核心流程
 * 1.创造了响应式数据
 * 2.模板装换成ast语法树
 * 3.将ast语法树转换了render函数
 * 4.后续每次数据更新可以只执行render函数 【无需再次执行ast转化的过程】
 */

import Watcher from './observe/watcher'
import { createElementVNode, createTextVNode } from './vnode'

function createEle(vnode) {
  const { tag, children, data, text } = vnode

  if (typeof tag === 'string') {
    //说明是标签
    vnode.el = document.createElement(tag) //将真是DOM挂在到虚拟DOM上，以便后续修改

    //处理节点属性
    patchProps(vnode.el, data)

    console.log('el', vnode.el)

    // 处理虚拟DOM中的children节点
    children.forEach(child => {
      vnode.el.appendChild(createEle(child))
    })
  } else {
    //说明是文本
    vnode.el = document.createTextNode(text)
  }

  return vnode.el //将真实DOM返回
}

function patchProps(el, props) {
  for (let key in props) {
    if (key === 'style') {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName]
      }
    } else {
      el.setAttribute(key, props[key])
    }
  }
}

function patch(oldVNode, vnode) {
  const isRealElement = oldVNode.nodeType

  if (isRealElement) {
    const ele = oldVNode

    const parentEle = ele.parentNode

    //不能先删除老DOM，否则会插入错误，找不到原来的DOM位置
    let newEle = createEle(vnode) // 新生成的DOM
    parentEle.insertBefore(newEle, ele.nextSibling) //先把新生成的DOM插入到老DOM的下一个
    parentEle.removeChild(ele) //删除老DOM

    return newEle
  } else {
    //diff算法部分
  }
}

export function initLifeCycle(Vue) {
  Vue.prototype._update = function (vnode) {
    const vm = this
    const el = vm.$el
    console.log('vnode', vnode)

    // 可以初始化，也可以更新
    vm.$el = patch(el, vnode) // 将新的DOM赋值给el
  }

  Vue.prototype._c = function () {
    return createElementVNode(this, ...arguments)
  }
  Vue.prototype._v = function () {
    return createTextVNode(this, ...arguments)
  }
  Vue.prototype._s = function (value) {
    if (typeof value !== 'object') return value
    return JSON.stringify(value)
  }

  // render函数会去产生虚拟节点（使用响应式数据）
  // 根据生成的虚拟DOM创建真实DOM
  Vue.prototype._render = function () {
    return this.$options.render.call(this)
  }
}

export function mountComponent(vm, el) {
  vm.$el = el
  //1.调用render，生成虚拟DOM

  const updateComponent = () => {
    vm._update(vm._render())
  }
  const watcher = new Watcher(vm, updateComponent, true) // 最后一个参数标识是否为渲染watcher
  console.log('watcher', watcher)

  // vm._update(vm._render());
  //2.根据虚拟DOM生成真实DOM
  //3.插入到el元素中
}
