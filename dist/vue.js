(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  // 正则图示网站  https://regexper.com/

  const ncname = '[a-zA-Z_][\\w\\-]*'; // 标签名
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // 标签名

  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 开始标签
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 结束标签
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 属性
  const startTagClose = /^\s*(\/?)>/; // 开始标签闭合

  function parseHTML(html) {
    /**
     * 通过下面的方法处理模板，生成ast语法树
     * 列用 栈 的思想去模拟html中dom的父子关系
     * --栈 中的最后一个元素就是当前元素的父级
     */
    // 处理开始标签.
    const ELEMENT_TYPE = 1;
    const TEXT_TYPE = 3;
    let root = null;
    const stack = []; // 栈
    let currentParent = null; // 指向的是栈中的最后一个元素

    function createASTElement(tag, attrs) {
      return {
        tag,
        type: ELEMENT_TYPE,
        children: [],
        attrs,
        parent: null
      };
    }
    function start(tag, attrs) {
      let node = createASTElement(tag, attrs);
      if (!root) {
        // 当前不存在根节点，则当前节点为根节点
        root = node;
      }
      if (currentParent) {
        node.parent = currentParent; // 设置当前节点的父级
        currentParent.children.push(node); // 将当前节点添加到父级的children
      }
      stack.push(node); // 进栈
      currentParent = node; // 修改currentParent指向
    }

    // 处理文本
    function chars(text) {
      // 直接放入当前currentParent的children
      text = text.replace(/\s/g, ' '); // 去除空格 不做细节处理
      currentParent.children.push({
        type: TEXT_TYPE,
        text,
        parent: currentParent
      });
    }

    // 处理结束标签
    function end(tag) {
      // tag可以用来校验当前标签是否合法
      stack.pop(); // 出栈
      currentParent = stack[stack.length - 1]; // 修改currentParent
    }

    // 截取去掉已经匹配过的部分
    function advance(n) {
      html = html.substring(n);
    }

    // 解析开始标签
    function parseStartTag() {
      const start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          // 标签名
          attrs: []
        };
        advance(start[0].length);
        let end, attr;
        // 如果不是开始标签的结束，就一直匹配下去
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          advance(attr[0].length);
          // 将解析出来的属性添加到attrs
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5] || true
          });
        }
        if (end) {
          advance(end[0].length);
        }
        return match;
      }
      return false; // 不是开始标签则直接返回false
    }
    while (html) {
      // textEnd是0，则是标签
      // textEnd是大于0，则是文本的结束位置
      let textEnd = html.indexOf('<'); // 如果返回结果是0，说明是个标签【开始标签或者结束标签】

      if (textEnd === 0) {
        // 说明是个标签
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        }
        let endTagMatch = html.match(endTag);
        if (endTagMatch) {
          end(endTagMatch.tagName);
          advance(endTagMatch[0].length);
          continue;
        }
      }
      if (textEnd > 0) {
        let text = html.substring(0, textEnd);
        if (text) {
          chars(text);
          advance(text.length);
        }
      }
    }
    return root;
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // 默认模板语法  表达式变量

  // 处理每一个子节点
  function gen(child) {
    if (child.type === 1) {
      //return `_c('${child.tag}',${child.attrs.length > 0 ? genAttrs(child.attrs) : 'null'}${child.children.length > 0 ? `,${genChildren(child.children)}` : ''})`
      return codegen(child);
    } else if (child.type === 3) {
      let text = child.text;
      if (defaultTagRE.test(text)) {
        // text = text.replace(defaultTagRE, (match, exp) => {
        //   return `_s(${exp})`
        // })

        let tokens = [];
        let match;
        defaultTagRE.lastIndex = 0; // 重置exec的校验位置，exec的lastIndex会向后移动
        let lastIndex = 0;
        while (match = defaultTagRE.exec(text)) {
          let index = match.index;
          if (index > lastIndex) {
            tokens.push(JSON.stringify(text.slice(lastIndex, index)));
          }
          tokens.push(`_s(${match[1].trim()})`);
          lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIndex)));
        }
        text = tokens.join("+");
        return `_v(${text})`;
      } else {
        text = JSON.stringify(text);
        return `_v(${text})`;
      }
    }
  }
  function genChildren(children) {
    return children.map(child => gen(child)).join(",");
  }

  // 处理当前节点的属性值
  function genAttrs(attrs) {
    let str = "";
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name === "style") {
        // 属性名是style的时候，需要处理多个属性为对象格式
        let obj = {};
        attr.value.split(";").forEach(item => {
          let [key, value] = item.split(":");
          obj[key] = value;
        });
        attr.value = obj;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`;
  }
  function codegen(ast) {
    let code = `_c('${ast.tag}',${ast.attrs.length > 0 ? genAttrs(ast.attrs) : "null"}${ast.children.length > 0 ? `,${genChildren(ast.children)}` : ""})`;
    console.log("code", code);
    return code;
  }
  function compileToFunction(template) {
    // const { code } = compile(template);
    // const render = new Function("Vue", code)(Vue);

    //1. 生成AST语法树
    let ast = parseHTML(template);

    //2. 生成render函数 【执行返回的结果就是虚拟dom】

    let code = codegen(ast);
    code = `with(this){return ${code}}`;
    let render = new Function(code);
    // _c('div',{id:'app'},_c('div',{style:{color:'red'}},_v(_s(name)+_s(age))))

    //3. 将render函数返回
    return render;
  }

  let id$1 = 0;
  class Dep {
    //属性的dep要收集watcher
    constructor() {
      this.id = id$1++;
      this.subs = [];
    }
    depend() {
      // 收集依赖，去掉重复收集的watcher；同时也需要让watcher去依赖dep
      // this.subs.push(Dep.target)

      Dep.target.addDep(this);
    }
    addSub(watcher) {
      this.subs.push(watcher);
    }
    notify() {
      this.subs.forEach(watcher => watcher.update()); // 通知更新
    }
  }
  Dep.target = null; // 全局静态变量

  let id = 0; // 做唯一标识

  // 观察者模式
  class Watcher {
    //不同组件有不同的watcher
    constructor(vm, fn, option) {
      this.id = id++;
      this.renderWatcher = option; //是否是渲染watcher
      this.getter = fn;
      this.deps = []; // 后续实现计算属性，和一些清理工作需要用到
      this.depIds = new Set();
      this.get();
    }
    get() {
      Dep.target = this; // 静态属性，只有这一个
      this.getter(); // 触发取值操作
      Dep.target = null;
    }
    addDep(dep) {
      let id = dep.id;
      if (!this.depIds.has(id)) {
        // 去重收集dep
        this.deps.push(dep);
        this.depIds.add(id);
        dep.addSub(this);
      }
    }
    update() {
      this.get(); // 触发更新，渲染试图
    }
  }

  function createElementVNode(vm, tag, data, ...children) {
    data = data || {}; // 避免data为null
    let key = data.key;
    if (key) {
      delete data.key;
    }
    return vnode(vm, tag, key, data, children);
  }
  function createTextVNode(vm, text) {
    return vnode(vm, undefined, undefined, undefined, undefined, text);
  }
  function vnode(vm, tag, key, data, children, text) {
    return {
      vm,
      tag,
      key,
      data,
      children,
      text
    };
  }

  /**
   * 核心流程
   * 1.创造了响应式数据
   * 2.模板装换成ast语法树
   * 3.将ast语法树转换了render函数
   * 4.后续每次数据更新可以只执行render函数 【无需再次执行ast转化的过程】
   */
  function createEle(vnode) {
    const {
      tag,
      children,
      data,
      text
    } = vnode;
    if (typeof tag === 'string') {
      //说明是标签
      vnode.el = document.createElement(tag); //将真是DOM挂在到虚拟DOM上，以便后续修改

      //处理节点属性
      patchProps(vnode.el, data);
      console.log('el', vnode.el);

      // 处理虚拟DOM中的children节点
      children.forEach(child => {
        vnode.el.appendChild(createEle(child));
      });
    } else {
      //说明是文本
      vnode.el = document.createTextNode(text);
    }
    return vnode.el; //将真实DOM返回
  }
  function patchProps(el, props) {
    for (let key in props) {
      if (key === 'style') {
        for (let styleName in props.style) {
          el.style[styleName] = props.style[styleName];
        }
      } else {
        el.setAttribute(key, props[key]);
      }
    }
  }
  function patch(oldVNode, vnode) {
    const isRealElement = oldVNode.nodeType;
    if (isRealElement) {
      const ele = oldVNode;
      const parentEle = ele.parentNode;

      //不能先删除老DOM，否则会插入错误，找不到原来的DOM位置
      let newEle = createEle(vnode); // 新生成的DOM
      parentEle.insertBefore(newEle, ele.nextSibling); //先把新生成的DOM插入到老DOM的下一个
      parentEle.removeChild(ele); //删除老DOM

      return newEle;
    }
  }
  function initLifeCycle(Vue) {
    Vue.prototype._update = function (vnode) {
      const vm = this;
      const el = vm.$el;
      console.log('vnode', vnode);

      // 可以初始化，也可以更新
      vm.$el = patch(el, vnode); // 将新的DOM赋值给el
    };
    Vue.prototype._c = function () {
      return createElementVNode(this, ...arguments);
    };
    Vue.prototype._v = function () {
      return createTextVNode(this, ...arguments);
    };
    Vue.prototype._s = function (value) {
      if (typeof value !== 'object') return value;
      return JSON.stringify(value);
    };

    // render函数会去产生虚拟节点（使用响应式数据）
    // 根据生成的虚拟DOM创建真实DOM
    Vue.prototype._render = function () {
      return this.$options.render.call(this);
    };
  }
  function mountComponent(vm, el) {
    vm.$el = el;
    //1.调用render，生成虚拟DOM

    const updateComponent = () => {
      vm._update(vm._render());
    };
    const watcher = new Watcher(vm, updateComponent, true); // 最后一个参数标识是否为渲染watcher
    console.log('watcher', watcher);

    // vm._update(vm._render());
    //2.根据虚拟DOM生成真实DOM
    //3.插入到el元素中
  }

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
      Object.defineProperty(data, '__ob__', {
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
    let dep = new Dep();
    Object.defineProperty(target, key, {
      get() {
        if (Dep.target) {
          dep.depend(); // 收集这个属性的watcher
        }
        return value;
      },
      set(newValue) {
        if (value === newValue) return;
        observe(value); // 如果赋的值是个对象，也需要做深层监听处理
        value = newValue;
        dep.notify(); // 通知更新
      }
    });
  }
  function observe(data) {
    // 只对对象进行劫持
    if (typeof data !== 'object' || data === null) {
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
      mountComponent(vm, el); //组件的挂载
    };
  }

  // runtime 是不包含模板编译的，整个编译是打包的时候同构loader来转义.vue文件的，用runtime的时候不能使用template【Vue实例上】

  function Vue(options) {
    // options就是用户的选项

    this._init(options);
  }
  initMixin(Vue);
  initLifeCycle(Vue);

  return Vue;

}));
//# sourceMappingURL=vue.js.map
