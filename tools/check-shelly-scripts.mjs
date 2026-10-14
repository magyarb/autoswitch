// Checks the Shelly scripts (fw.js, restarter.js) against what the device's JavaScript engine
// supports and its documented resource limits:
// https://shelly-api-docs.shelly.cloud/gen2/Scripts/LanguageReference
// usage: node tools/check-shelly-scripts.mjs fw.js restarter.js
import { readFileSync } from 'node:fs'
import { parse } from 'acorn'
import { ancestor, simple } from 'acorn-walk'

const MAX_ENDPOINTS = 5
const MAX_TIMERS = 5

// syntax the engine doesn't support (or that we don't rely on)
const FORBIDDEN = {
  ArrowFunctionExpression: 'arrow function',
  TemplateLiteral: 'template literal',
  ClassDeclaration: 'class',
  ClassExpression: 'class',
  SpreadElement: 'spread (...)',
  RestElement: 'rest parameter (...)',
  ObjectPattern: 'destructuring',
  ArrayPattern: 'destructuring',
  AssignmentPattern: 'default parameter',
  ChainExpression: 'optional chaining (?.)',
  AwaitExpression: 'await',
  YieldExpression: 'generator'
}

function check(file) {
  const source = readFileSync(file, 'utf8')
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true })
  const errors = []
  const fail = (node, message) => errors.push(`${file}:${node.loc.start.line}: ${message}`)

  simple(ast, {
    VariableDeclaration(node) {
      if (node.kind === 'const') fail(node, 'const is not supported, use let')
    },
    LogicalExpression(node) {
      if (node.operator === '??') fail(node, 'nullish coalescing (??) is not supported')
    },
    Function(node) {
      if (node.async) fail(node, 'async functions are not supported')
      if (node.generator) fail(node, 'generators are not supported')
    },
    // Espruino reads the next line as the return value unless `;` or `}` follows a bare
    // return, and prettier strips the semicolons, so `return` + newline + `if (...)` fails
    ReturnStatement(node) {
      if (!node.argument)
        fail(node, 'bare return: the device parses the next line as the return value, use return null')
    },
    NewExpression(node) {
      if (node.callee.name === 'Promise') fail(node, 'promises are not supported')
    }
  })
  for (const [type, label] of Object.entries(FORBIDDEN)) {
    simple(ast, { [type]: node => fail(node, `${label} is not supported`) })
  }

  // deeply nested anonymous callbacks can crash the device: allow one level, inside a named function
  ancestor(ast, {
    Function(node, _state, ancestors) {
      const enclosing = ancestors.slice(0, -1).filter(a => a.type.includes('Function'))
      if (node.type === 'FunctionDeclaration' && enclosing.length) {
        fail(node, `function ${node.id.name} is declared inside another function; declare it at the top level`)
      }
      if (node.type === 'FunctionExpression' && enclosing.some(a => a.type === 'FunctionExpression')) {
        fail(node, 'callback nested inside another callback; move the inner one to a named top-level function')
      }
    }
  })

  // resource limits
  const calls = (object, method) => {
    let count = 0
    simple(ast, {
      CallExpression(node) {
        const { callee } = node
        if (callee.type === 'MemberExpression' && callee.object.name === object && callee.property.name === method)
          count++
      }
    })
    return count
  }
  const endpoints = calls('HTTPServer', 'registerEndpoint')
  if (endpoints > MAX_ENDPOINTS) errors.push(`${file}: ${endpoints} HTTP endpoints, the device allows ${MAX_ENDPOINTS}`)
  const timers = calls('Timer', 'set')
  if (timers > MAX_TIMERS) errors.push(`${file}: ${timers} timers, the device allows ${MAX_TIMERS}`)

  // no hoisting: top-level code may only use functions declared above it
  const declaredAt = new Map()
  for (const node of ast.body) if (node.type === 'FunctionDeclaration') declaredAt.set(node.id.name, node.start)
  for (const statement of ast.body) {
    if (statement.type === 'FunctionDeclaration') continue
    ancestor(statement, {
      Identifier(node, _state, ancestors) {
        if (ancestors.some(a => a.type.includes('Function'))) return
        const at = declaredAt.get(node.name)
        if (at !== undefined && at > statement.start)
          fail(node, `${node.name} is used before it is declared (no hoisting)`)
      }
    })
  }

  return errors
}

const errors = process.argv.slice(2).flatMap(check)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Shelly scripts OK: ${process.argv.slice(2).join(', ')}`)
