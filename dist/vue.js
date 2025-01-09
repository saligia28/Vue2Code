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
      text = text.replace(/\s/g, ''); // 去除空格 不做细节处理
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

  function gen(node) {
    if (node.type === 1) {
      //return `_c('${node.tag}',${node.attrs.length > 0 ? genAttrs(node.attrs) : 'null'}${node.children.length > 0 ? `,${genChildren(node.children)}` : ''})`
      return codegen(node);
    } else if (node.type === 3) {
      let text = node.text;
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
        text = tokens.join('+');
      }
      return `_v(${JSON.stringify(text)})`;
    }
  }
  function genChildren(children) {
    return children.map(child => gen(child)).join(',');
  }
  function genAttrs(attrs) {
    let str = '';
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name === 'style') {
        // 属性名是style的时候，需要处理多个属性为对象格式
        let obj = {};
        attr.value.split(';').forEach(item => {
          let [key, value] = item.split(':');
          obj[key] = value;
        });
        attr.value = obj;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`;
  }
  function codegen(ast) {
    `_c('${ast.tag}',${ast.attrs.length > 0 ? genAttrs(ast.attrs) : 'null'}${ast.children.length > 0 ? `,${genChildren(ast.children)}` : ''})`;
  }
  function compileToFunction(template) {
    // const { code } = compile(template);
    // const render = new Function("Vue", code)(Vue);

    //1. 生成AST语法树
    let ast = parseHTML(template);

    //2. 生成render函数 【执行返回的结果就是虚拟dom】

    codegen(ast);
    // _c('div',{id:'app'},_c('div',{style:{color:'red'}},_v(_s(name)+_s(age))))

    //3. 将render函数返回
    return render;
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
        if (template) {
          const render = compileToFunction(template);
          options.render = render;
        }
      }
      options.render;
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
