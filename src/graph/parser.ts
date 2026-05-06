import {parse, ParseResult} from '@babel/parser'
import {readFileSync} from 'fs'
import traverse, {NodePath} from '@babel/traverse'
import {buildGraph} from './graph'
import {hashNode} from './hash'

type Collector = {
  key: string
  enter?: (path: NodePath) => void
  exit?: (path: NodePath) => void
  result: () => any
}

function createImportsCollector(): Collector {
  const imports: any[] = []

  return {
    key: 'imports',
    enter(path) {
      if (path.isImportDeclaration()) {
        imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers
            .map((s: any) => {
              if (s.type === 'ImportSpecifier') {
                return {
                  imported: s.imported.name,
                  local: s.local.name,
                  type: 'named',
                }
              }

              if (s.type === 'ImportDefaultSpecifier') {
                return {
                  imported: 'default',
                  local: s.local.name,
                  type: 'default',
                }
              }

              if (s.type === 'ImportNamespaceSpecifier') {
                return {
                  imported: '*',
                  local: s.local.name,
                  type: 'namespace',
                }
              }

              return {
                imported: 'unknown',
                local: s.local.name,
                type: 'unknown',
              }
            })
            .sort(),
        })
      }
    },
    result: () => imports.sort(),
  }
}

function createExportsCollector(): Collector {
  const exports: any[] = []

  const pushExport = (name: string, local: string, kind: string) => {
    const isDefault = name === 'default'
    exports.push({
      name: isDefault ? 'default' : name,
      local: isDefault ? 'default' : local,
      kind,
    })
  }

  return {
    key: 'exports',
    enter(path) {
      if (path.isExportNamedDeclaration()) {
        const node = path.node
        const decl = node.declaration

        if (decl?.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            const id = d.id
            const init = d.init

            if (!id) continue

            const isFunction = isFunctionLike(init)
            const isClass = init?.type === 'ClassExpression'

            // identifier
            if (id.type === 'Identifier') {
              pushExport(id.name, id.name, isFunction ? 'function' : isClass ? 'class' : 'variable')
            }

            // object destructuring
            if (id.type === 'ObjectPattern') {
              for (const prop of id.properties) {
                if (prop.type === 'ObjectProperty' && prop.value.type === 'Identifier') {
                  pushExport(prop.value.name, prop.value.name, 'destructured')
                }
              }
            }

            // array destructuring
            if (id.type === 'ArrayPattern') {
              for (const el of id.elements) {
                if (el?.type === 'Identifier') {
                  pushExport(el.name, el.name, 'destructured')
                }
              }
            }
          }
        }

        if (decl && (decl.type === 'FunctionDeclaration' || decl.type === 'TSDeclareFunction')) {
          if (decl.id?.type === 'Identifier') {
            pushExport(decl.id.name, decl.id.name, 'function')
          }
        }

        if (decl?.type === 'ClassDeclaration') {
          pushExport(decl.id?.name ?? 'default', decl.id?.name ?? 'default', 'class')
        }

        if (node.specifiers?.length) {
          for (const s of node.specifiers as any) {
            if (s.exported && s.local) {
              pushExport(s.exported.name, s.local.name, 'variable')
            }
          }
        }
      }

      if (path.isExportDefaultDeclaration()) {
        const decl = path.node.declaration

        if (decl.type === 'Identifier') {
          pushExport('default', decl.name, 'default')
        }

        if (decl.type === 'FunctionDeclaration') {
          pushExport('default', decl.id?.name ?? 'default', 'default')
        }

        if (decl.type === 'ClassDeclaration') {
          pushExport('default', decl.id?.name ?? 'default', 'default')
        }

        if (decl.type === 'ArrowFunctionExpression') {
          pushExport('default', 'default', 'default')
        }
      }
    },
    result: () => exports.sort(),
  }
}

function createReexportsCollector(): Collector {
  const reexports: any[] = []

  return {
    key: 'reexports',
    enter(path) {
      if (path.isExportAllDeclaration()) {
        reexports.push({
          source: path.node.source.value,
          specifiers: ['*'],
        })
      }

      if (path.isExportNamedDeclaration() && path.node.source) {
        reexports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers
            .map((s: any) => {
              if (s.type === 'ImportSpecifier') {
                return {
                  reexported: s.reexported.name,
                  local: s.local.name,
                  type: 'named',
                }
              }

              if (s.type === 'ImportDefaultSpecifier') {
                return {
                  rexported: 'default',
                  local: s.local.name,
                  type: 'default',
                }
              }

              if (s.type === 'ImportNamespaceSpecifier') {
                return {
                  reexported: '*',
                  local: s.local.name,
                  type: 'namespace',
                }
              }

              return {
                rexported: 'unknown',
                local: s.local.name,
                type: 'unknown',
              }
            })
            .sort(),
        })
      }
    },
    result: () => reexports.sort(),
  }
}

function createFunctionBodiesCollector(source: string): Collector {
  const bodies: string[] = []

  return {
    key: 'bodies',
    enter(path) {
      if (path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression()) {
        const {start, end} = path.node
        if (start == null || end == null) return

        const body = path.node.body
        if (!body || body.start == null || body.end == null) return

        const code = source.slice(body.start, body.end)
        bodies.push(code)
      }
    },
    result: () => bodies.sort(),
  }
}

function createSymbolCollector(): Collector {
  const symbols: any[] = []
  const seen = new Set()

  return {
    key: 'symbols',
    enter(path) {
      if (path.isFunctionDeclaration()) {
        const node = path.node
        if (!node.id) return

        const key = `fn:${node.id.name}`
        if (seen.has(key)) return

        seen.add(key)
        symbols.push({
          name: node.id.name,
          kind: 'function',
          hash: hashNode(node),
        })
      }

      if (path.isClassDeclaration()) {
        const node = path.node
        if (!node.id) return

        const key = `class:${node.id.name}`
        if (seen.has(key)) return
        seen.add(key)

        symbols.push({
          name: node.id.name,
          kind: 'class',
          hash: hashNode(node),
        })
      }

      if (path.isVariableDeclarator()) {
        const id = path.node.id
        const init = path.node.init
        if (id.type !== 'Identifier') return

        const key = `var:${id.name}`
        if (seen.has(key)) return
        seen.add(key)

        symbols.push({...classifyVariableDeclarator(id, init), hash: hashNode(path.node)})
      }
    },
    exit(path) {},
    result: () => symbols.sort(),
  }
}

export class ModuleGraphParseStage {
  parse(entry: string): ModuleGraphExtractStage {
    if (!entry || typeof entry !== 'string') {
      throw new Error(`Invalid filePath: ${entry}`)
    }

    const code = readFileSync(entry, 'utf-8')

    const ast = parse(code, {sourceType: 'module', plugins: ['typescript', 'jsx']})
    return new ModuleGraphExtractStage(ast)
  }
}

export class ModuleGraphExtractStage {
  private collectors: Collector[] = []

  constructor(private ast: ParseResult) {}

  withImports() {
    this.collectors.push(createImportsCollector())
    return this
  }

  withExports() {
    this.collectors.push(createExportsCollector())
    return this
  }

  withReexports() {
    this.collectors.push(createReexportsCollector())
    return this
  }

  withSymbols() {
    this.collectors.push(createSymbolCollector())
    return this
  }

  withFunctionBodies(source: string) {
    this.collectors.push(createFunctionBodiesCollector(source))
    return this
  }

  extract() {
    traverse(this.ast, {
      enter: (path) => {
        for (const c of this.collectors) {
          c.enter?.(path)
        }
      },
      exit: (path) => {
        for (const c of this.collectors) {
          c.exit?.(path)
        }
      },
    })

    return Object.fromEntries(this.collectors.map((c) => [c.key, c.result()]))
  }
}

export class ModuleGraphBuildStage {
  build(result: any) {
    return buildGraph(result)
  }
}

type Symbol = {
  name: string
  kind: 'function' | 'class' | 'variable'
  exported: boolean
}

const isFunctionLike = (init: any) => {
  if (!init) return false

  return ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(init.type)
}

const classifyVariableDeclarator = (id: any, init: any) => {
  if (init?.type === 'ClassExpression') {
    return {
      name: id.name,
      kind: 'class' as const,
    }
  }

  if (isFunctionLike(init)) {
    const isAsync = !!init?.async
    const isGenerator = !!init?.generator

    return {
      name: id.name,
      kind: 'function' as const,
      ...(isAsync && {async: true}),
      ...(isGenerator && {generator: true}),
    }
  }

  return {
    name: id.name,
    kind: 'variable' as const,
  }
}
