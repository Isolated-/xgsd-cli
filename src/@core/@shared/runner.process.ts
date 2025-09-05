import _ = require('lodash')
import {HelperFn, helpers} from './workflow.helpers'

export function callHelper(helperName: string, value: any, ...args: any[]) {
  const fn: HelperFn | undefined = helpers[helperName]
  if (!fn) throw new Error(`Helper "${helperName}" not found`)
  return fn(value, ...args)
}

export function isNumberString(str: string) {
  return isNaN(Number(str)) === false
}

// Resolve a single template string, e.g., "{{ .input.user.name | upper }}"
export function resolveTemplate(template: string, context: any): any {
  const regex = /{{\s*(.+?)\s*}}/
  const match = regex.exec(template)
  if (!match) return template

  let expr = match[1] // e.g., ".input.user | json | hash | slice(0, 8)"

  // Split path vs filters
  const [pathStr, ...filterParts] = expr.split('|').map((s) => s.trim())

  // Convert .steps[0].output.data -> ['steps','0','output','data']
  const pathArray = pathStr
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let value = getNestedValue(context, pathArray)

  // Apply all filters sequentially
  for (const filterExpr of filterParts) {
    // Check if filter has arguments: slice(0, 8)
    const argMatch = /^(\w+)\((.*)\)$/.exec(filterExpr)
    if (argMatch) {
      const [, helperName, argsStr] = argMatch
      const args = argsStr
        .split(',')
        .map((s) => s.trim())
        .map((s) => {
          const pathArray = s
            .replace(/\[(\d+)\]/g, '.$1')
            .split('.')
            .filter(Boolean)

          // resolve value
          const resolvedValue = getNestedValue(context, pathArray)
          if (isNumberString(resolvedValue)) {
            return resolvedValue
          }

          if (Array.isArray(resolvedValue) || typeof resolvedValue === 'object') {
            return resolvedValue
          }

          if (typeof resolvedValue === 'string') {
            return resolvedValue.replace(/^['"]|['"]$/g, '')
          }

          return resolvedValue
        })
      value = callHelper(helperName, value, ...args)
    } else {
      value = callHelper(filterExpr, value)
    }
  }

  return value
}

// utils.ts
export function getNestedValue(obj: any, pathArray: string[]): any {
  if (pathArray.length === 1 && typeof pathArray[0] === 'string' && !obj[pathArray[0]]) {
    if (isNumberString(pathArray[0])) {
      return parseInt(pathArray[0])
    }

    return pathArray[0].replace(/^["]|["]$/g, '')
  }

  return pathArray.reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

export function resolveStepData(obj: any, context: any): any {
  if (typeof obj === 'string') {
    return resolveTemplate(obj, context)
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => resolveStepData(v, context))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: any = {}
    for (const key in obj) {
      result[key] = resolveStepData(obj[key], context)
    }
    return result
  }

  return obj // leave numbers, booleans, null, etc. intact
}

export function resolveStepTemplates(step: any, workflow: any) {
  // Context includes all previous steps, plus current step input
  const context = {
    ...workflow,
    output: step.output || {},
    steps: workflow.steps.map((s: any) => ({
      input: s.input,
      output: s.output,
      data: s.data,
    })),
  }

  // Resolve all fields in step (or step.with)
  step = resolveStepData(step, context)

  return step
}
