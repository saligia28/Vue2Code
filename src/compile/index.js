import { parseHTML } from './parse'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g // 默认模板语法  表达式变量

function gen(node) {
  if (node.type === 1) {
    //return `_c('${node.tag}',${node.attrs.length > 0 ? genAttrs(node.attrs) : 'null'}${node.children.length > 0 ? `,${genChildren(node.children)}` : ''})`
    return codegen(node)
  } else if (node.type === 3) {
    let text = node.text
    if (defaultTagRE.test(text)) {
      // text = text.replace(defaultTagRE, (match, exp) => {
      //   return `_s(${exp})`
      // })
      let tokens = []
      let match
      defaultTagRE.lastIndex = 0 // 重置exec的校验位置，exec的lastIndex会向后移动
      let lastIndex = 0
      while ((match = defaultTagRE.exec(text))) {
        let index = match.index
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)))
        }
        tokens.push(`_s(${match[1].trim()})`)
        lastIndex = index + match[0].length

      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
      }
      text = tokens.join('+')
    }
    

    return `_v(${JSON.stringify(text)})`
  }
}

function genChildren(children) {
  return children.map(child => gen(child)).join(',')
}

function genAttrs(attrs) {
  let str = ''
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (attr.name === 'style') {
      // 属性名是style的时候，需要处理多个属性为对象格式
      let obj = {}
      attr.value.split(';').forEach(item => {
        let [key, value] = item.split(':')
        obj[key] = value
      })
      attr.value = obj
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  }
  return `{${str.slice(0, -1)}}`
}

function codegen(ast) {
  let code = `_c('${ast.tag}',${ast.attrs.length > 0 ? genAttrs(ast.attrs) : 'null'}${
    ast.children.length > 0 ? `,${genChildren(ast.children)}` : ''
  })`
}

export function compileToFunction(template) {
  // const { code } = compile(template);
  // const render = new Function("Vue", code)(Vue);

  //1. 生成AST语法树
  let ast = parseHTML(template)

  //2. 生成render函数 【执行返回的结果就是虚拟dom】

  codegen(ast)
  // _c('div',{id:'app'},_c('div',{style:{color:'red'}},_v(_s(name)+_s(age))))

  //3. 将render函数返回
  return render
}
