// 正则图示网站  https://regexper.com/

const ncname = '[a-zA-Z_][\\w\\-]*' // 标签名
const qnameCapture = `((?:${ncname}\\:)?${ncname})` // 标签名

const startTagOpen = new RegExp(`^<${qnameCapture}`) // 开始标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`) // 结束标签
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/ // 属性
const startTagClose = /^\s*(\/?)>/ // 开始标签闭合
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g // 默认模板语法  表达式变量

export function parseHTML(html) {
  /**
   * 通过下面的方法处理模板，生成ast语法树
   * 列用 栈 的思想去模拟html中dom的父子关系
   * --栈 中的最后一个元素就是当前元素的父级
   */
  // 处理开始标签.
  const ELEMENT_TYPE = 1
  const TEXT_TYPE = 3

  let root = null
  const stack = [] // 栈
  let currentParent = null // 指向的是栈中的最后一个元素

  function createASTElement(tag, attrs) {
    return {
      tag,
      type: ELEMENT_TYPE,
      children: [],
      attrs,
      parent: null,
    }
  }

  function start(tag, attrs) {
    let node = createASTElement(tag, attrs)
    if(!root) { // 当前不存在根节点，则当前节点为根节点
      root = node
    }

    if(currentParent) {
      node.parent = currentParent // 设置当前节点的父级
      currentParent.children.push(node) // 将当前节点添加到父级的children
    }

    stack.push(node) // 进栈
    currentParent = node // 修改currentParent指向

  }

  // 处理文本
  function chars(text) { // 直接放入当前currentParent的children
    text = text.replace(/\s/g, '') // 去除空格 不做细节处理
    currentParent.children.push({
      type: TEXT_TYPE,
      text,
      parent: currentParent
    })
  }

  // 处理结束标签
  function end(tag) {
    // tag可以用来校验当前标签是否合法
    stack.pop() // 出栈
    currentParent = stack[stack.length - 1] // 修改currentParent
  }

  // 截取去掉已经匹配过的部分
  function advance(n) {
    html = html.substring(n)
  }

  // 解析开始标签
  function parseStartTag() {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: [],
      }
      advance(start[0].length)
      let end, attr
      // 如果不是开始标签的结束，就一直匹配下去
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length)
        // 将解析出来的属性添加到attrs
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5] || true,
        })
      }
      if (end) {
        advance(end[0].length)
      }
      
      return match
    }

    return false // 不是开始标签则直接返回false
  }

  while (html) {
    // textEnd是0，则是标签
    // textEnd是大于0，则是文本的结束位置
    let textEnd = html.indexOf('<') // 如果返回结果是0，说明是个标签【开始标签或者结束标签】

    if (textEnd === 0) {
      // 说明是个标签
      const startTagMatch = parseStartTag()
      
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs)
        
        continue
      }

      let endTagMatch = html.match(endTag)
      if (endTagMatch) {
        end(endTagMatch.tagName)
        advance(endTagMatch[0].length)
        continue
      }
    }

    if (textEnd > 0) {
      let text = html.substring(0, textEnd)

      if (text) {
        chars(text)
        advance(text.length)
      }
    }
  }

  return root
}