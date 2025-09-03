import {resolveTemplate} from '../runner.process'
import {createHash} from 'crypto'
import moment = require('moment')

describe('misc upper/lower tests', () => {
  it('should return the original number', () => {
    const template = '${{ .input.number | upper }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)

    const template2 = '${{ .input.number | lower }}'
    const resolvedTemplate2 = resolveTemplate(template2, {input: {number: 42}})

    expect(resolvedTemplate2).toEqual(42)
  })
})

describe('misc trim tests', () => {
  it('should return the number when trim is called on an array of numbers', () => {
    const template = '${{ .input.array | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: [42, 24]}})

    expect(resolvedTemplate).toEqual([42, 24])
  })

  it('should return the number when trim is called with a number', () => {
    const template = '${{ .input.number | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)
  })
})

describe('misc hash tests', () => {
  it('should return the input when called with non-string values', () => {
    const template = '${{ .input.number | hash }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)
  })
})

/**
 *  concat tests
 */
describe('concat()', () => {
  it('should concatenate two arrays', () => {
    const template = '${{ .input.array1 | concat(.input.array2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array1: ['Hello'], array2: ['World!']}})

    expect(resolvedTemplate).toEqual(['Hello', 'World!'])
  })
})

/**
 *  trim tests
 */
describe('trim()', () => {
  it('should trim whitespace from both ends of an array of strings', () => {
    const template = '${{ .input.array | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['  Hello ', '  World!  ']}})

    expect(resolvedTemplate).toEqual(['Hello', 'World!'])
  })
})

/**
 *  json tests
 */
describe('json()', () => {
  it('should convert an array of strings to a JSON string', () => {
    const template = '${{ .input.array | json }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['Hello', 'World!']}})

    expect(resolvedTemplate).toBe('["Hello","World!"]')
  })

  it('should convert json string into array', () => {
    const template = '${{ .input.array | json }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: '["Hello","World!"]'}})

    expect(resolvedTemplate).toEqual(['Hello', 'World!'])
  })
})

/**
 *  slice tests
 */
describe('slice()', () => {
  it('should slice an array from start to end', () => {
    const template = '${{ .input.array | slice(0, 2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['Hello', 'World!', 'Foo', 'Bar']}})

    expect(resolvedTemplate).toEqual(['Hello', 'World!'])
  })
})

/**
 *  length tests
 */
describe('length()', () => {
  it('should return the length of an array', () => {
    const template = '${{ .input.array | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['Hello', 'World!']}})

    expect(resolvedTemplate).toBe(2)
  })
})

/**
 *  !null tests
 */
describe('!null()', () => {
  // return true if not null
  it('should return true for non-null array', () => {
    const template = '${{ .input.array | !null }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['Hello', 'World!']}})

    expect(resolvedTemplate).toBe(true)
  })

  // return false if null
  it('should return false for null array', () => {
    const template = '${{ .input.array | !null }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: null}})

    expect(resolvedTemplate).toBe(false)
  })
})

/**
 *  !empty tests
 */
describe('!empty()', () => {
  it('should return false on null', () => {
    const template = '${{ .input.array | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: null}})

    expect(resolvedTemplate).toBe(false)
  })

  it('should return false on empty object', () => {
    const template = '${{ .input.object | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {object: {}}})

    expect(resolvedTemplate).toBe(false)
  })

  // return false on empty array
  it('should return false for empty array', () => {
    const template = '${{ .input.array | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: []}})

    expect(resolvedTemplate).toBe(false)
  })

  // return true on non-empty array
  it('should return true for non-empty array', () => {
    const template = '${{ .input.array | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {array: ['Hello', 'World!']}})

    expect(resolvedTemplate).toBe(true)
  })
})

test('transformation should allow for single / no helper', () => {
  const template = '${{ hello world }}'
  expect(resolveTemplate(template, {})).toEqual('hello world')
})

describe('templating behaviour (misc)', () => {
  test('when using templates with raw string/number, original is returned', () => {
    const template = '${{ 42 }}'
    expect(resolveTemplate(template, {})).toEqual(42)

    const template2 = '${{ "hello" }}'
    expect(resolveTemplate(template2, {})).toEqual('hello')
  })

  test('when using template with object properties', () => {
    const template = '${{ input.a }}'
    expect(resolveTemplate(template, {input: {a: 'hello', b: 'world'}})).toEqual('hello')
  })

  test("leading dot doesn't matter", () => {
    const template = '${{ .input.a }}'
    expect(resolveTemplate(template, {input: {a: 'hello', b: 'world'}})).toEqual('hello')
  })

  test('trailing dot doesnt matter', () => {
    const template = '${{ input.a. }}'
    expect(resolveTemplate(template, {input: {a: 'hello', b: 'world'}})).toEqual('hello')
  })
})

describe('allow plain expressions (no using context data)', () => {
  test('allow raw integer values', () => {
    const template = '${{ 15 | add(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(20)
  })

  test('allow raw string values (unquoted)', () => {
    const template = '${{ hello | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(5)
  })

  test('allow raw string values (quoted)', () => {
    const template = '${{ "hello" | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(5)
  })

  test('allow raw json strings (unquoted)', () => {
    const template = '${{ { "hello": "world" } | json }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual({hello: 'world'})
  })
})

/**
 *  default() tests
 */
describe('default()', () => {
  test('default() should return the default value if input is null or undefined', () => {
    const template = '${{ .input.a | default("default value") }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: null}})
    expect(resolvedTemplate).toEqual('default value')
  })

  test('default() should return the input value if it is not null or undefined', () => {
    const template = '${{ .input.a | default("default value") }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 'actual value'}})
    expect(resolvedTemplate).toEqual('actual value')
  })

  test('default() wont work with unnested objects when input = null', () => {
    const template = '${{ .input | default("default value") }}'
    const resolvedTemplate = resolveTemplate(template, {input: null})
    expect(resolvedTemplate).toEqual('input')
  })
})

/**
 *  concat() non-array/string tests
 */
describe('concat()', () => {
  test('concat() on two numbers should return the original number', () => {
    const template = '${{ .input.num1 | concat(.input.num2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {num1: 42, num2: 24}})
    expect(resolvedTemplate).toEqual(42)
  })

  test('calling concat() on two objects should return the input object', () => {
    const template = '${{ .input.obj1 | concat(.input.obj2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {obj1: {a: 1}, obj2: {b: 2}}})
    expect(resolvedTemplate).toEqual({a: 1})
  })
})

/**
 *  !empty misc tests
 */
describe('!empty()', () => {
  test('calling !empty() with numbers should return true', () => {
    const template = '${{ 42 | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  merge() tests
 */
describe('merge()', () => {
  test('merge() on two objects should merge the objects', () => {
    const template = '${{ .input.obj1 | merge(.input.obj2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {obj1: {a: 1}, obj2: {b: 2}}})
    expect(resolvedTemplate).toEqual({a: 1, b: 2})
  })

  test('merge() on non-object inputs should return the original input', () => {
    const template = '${{ 42 | merge(24) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(42)
  })
})

/**
 *  trim() non-array/string tests
 */
describe('trim()', () => {
  test('trim() on object should return object', () => {
    const template = '${{ .input | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual({a: true, b: true})
  })

  test('trim() on number should return number', () => {
    const template = '${{ 42 | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(42)
  })
})

/**
 *  json non-supported tests
 */
describe('json()', () => {
  test('json() when called with non-string string input should return the original string', () => {
    const template = '${{ "my string" | json }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual('my string')
  })
})

/**
 *  length object tests
 */
describe('length()', () => {
  test('length() on object should return the length of the object', () => {
    const template = '${{ { "hello": "world", "my": "object" } | json | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(2)
  })

  test('length() returns 0 when not an array, string, or object', () => {
    const template = '${{ 42 | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(0)
  })
})

/**
 *  now() tests
 */
describe('now()', () => {
  test('now() returns the current date and time', () => {
    const template = '${{ str | now }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})

    expect(moment(resolvedTemplate).isSameOrAfter(moment(), 'second')).toBe(true)
  })
})

/**
 *  gt() tests
 */
describe('gt()', () => {
  test('greater than comparison', () => {
    const template = '${{ 10 | gt(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('greater than comparison from input', () => {
    const template = '${{ input.a | gt(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('greater than comparison from input with secondary input', () => {
    const template = '${{ .input.a | gt(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 5}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  add() tests
 */
describe('add()', () => {
  test('adding two numbers', () => {
    const template = '${{ 1 | add(2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(3)
  })
})

/**
 *  sub() tests
 */
describe('sub()', () => {
  test('subtracting two numbers', () => {
    const template = '${{ 5 | sub(2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(3)
  })
})

/**
 *  mul() tests
 */
describe('mul()', () => {
  test('multiplying two numbers', () => {
    const template = '${{ 2 | mul(3) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(6)
  })
})

/**
 *  div() tests
 */
describe('div()', () => {
  test('dividing two numbers', () => {
    const template = '${{ 6 | div(2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(3)
  })
})

/**
 *  lt() tests
 */
describe('lt()', () => {
  test('less than comparison', () => {
    const template = '${{ 10 | lt(15) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('less than comparison from input', () => {
    const template = '${{ input.a | lt(15) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('less than comparison from input with secondary input', () => {
    const template = '${{ .input.a | lt(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 15}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  gte() tests
 */
describe('gte()', () => {
  test('greater than or equal to comparison', () => {
    const template = '${{ 10 | gte(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('greater than or equal to comparison from input', () => {
    const template = '${{ input.a | gte(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('greater than or equal to comparison from input with secondary input', () => {
    const template = '${{ .input.a | gte(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 5}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  lte() tests
 */
describe('lte()', () => {
  test('less than or equal to comparison', () => {
    const template = '${{ 10 | lte(15) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('less than or equal to comparison from input', () => {
    const template = '${{ input.a | lte(15) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('less than or equal to comparison from input with secondary input', () => {
    const template = '${{ .input.a | lte(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 15}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  eq() tests
 */
describe('eq()', () => {
  test('equality comparison', () => {
    const template = '${{ 10 | eq(10) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('equality comparison from input', () => {
    const template = '${{ input.a | eq(10) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('equality comparison from input with secondary input', () => {
    const template = '${{ .input.a | eq(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 10}})
    expect(resolvedTemplate).toEqual(true)
  })
})

/**
 *  neq() tests
 */
describe('neq()', () => {
  test('not equal comparison', () => {
    const template = '${{ 10 | neq(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: true, b: true}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('not equal comparison from input', () => {
    const template = '${{ input.a | neq(5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10}})
    expect(resolvedTemplate).toEqual(true)
  })

  test('not equal comparison from input with secondary input', () => {
    const template = '${{ .input.a | neq(.input.b) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {a: 10, b: 5}})
    expect(resolvedTemplate).toEqual(true)
  })
})

const helloWorldHash = createHash('sha256').update('Hello World!').digest('hex')

/**
 *  trim tests
 */
describe('trim()', () => {
  it('should trim whitespace from both ends of a string', () => {
    const template = '${{ .input.string | trim }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: '  Hello World!  '}})

    expect(resolvedTemplate).toBe('Hello World!')
  })
})

/**
 *  upper tests
 */
describe('upper()', () => {
  it('should convert a string to uppercase', () => {
    const template = '${{ .input.string | upper }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('HELLO WORLD!')
  })
})

/**
 *  lower tests
 */
describe('lower()', () => {
  it('should convert a string to lowercase', () => {
    const template = '${{ .input.string | lower }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('hello world!')
  })
})

/**
 *  hash tests
 */
describe('hash()', () => {
  it('should generate a hash from a string', () => {
    const template = '${{ .input.string | hash }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toEqual(helloWorldHash)
  })
})

/**
 *  censor tests
 */
describe('censor()', () => {
  test('censor() should replace all characters with *', () => {
    const template = '${{ .input.string | censor }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('************')
  })

  test('calling censor() with anything other than a string returns unchanged input', () => {
    const template = '${{ .input.number | censor }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)
  })
})

/**
 *  truncate tests
 */
describe('truncate()', () => {
  it('should truncate a string to a specified length', () => {
    const template = '${{ .input.string | truncate(2, 2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('He...d!')
  })

  it('should return original input when called with non-string', () => {
    const template = '${{ .input.number | truncate(2, 2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)
  })

  it('should return the string when called with a string longer than the specified length', () => {
    const template = '${{ .input.string | truncate(5, 2) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hel'}})

    expect(resolvedTemplate).toBe('Hel')
  })
})

/**
 *  uuid tests
 */
describe('uuid()', () => {
  it('should generate a UUID', () => {
    const template = '${{ .input.string | uuid }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

/**
 *  slice tests
 */
describe('slice()', () => {
  it('should slice a string from start to end', () => {
    const template = '${{ .input.string | slice(0, 5) }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('Hello')
  })
})

/**
 *  length tests
 */
describe('length()', () => {
  it('should return the length of a string', () => {
    const template = '${{ .input.string | length }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe(12)
  })
})

/**
 *  replace tests
 */
describe('replace()', () => {
  it('should replace all occurrences of a substring with another substring', () => {
    const template = '${{ .input.string | replace("World", "Universe") }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('Hello Universe!')
  })

  it('should return a string unchanged if the substring to be replaced is not found', () => {
    const template = '${{ .input.string | replace("NotFound", "Universe") }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe('Hello World!')
  })

  it('should return the original input when called with non-string', () => {
    const template = '${{ .input.number | replace("NotFound", "Universe") }}'
    const resolvedTemplate = resolveTemplate(template, {input: {number: 42}})

    expect(resolvedTemplate).toEqual(42)
  })
})
/**
 *  concat tests
 */
describe('concat()', () => {
  it('should concatenate two strings', () => {
    const template = "${{ .input.string1 | concat('World!') }}"

    const resolvedTemplate = resolveTemplate(template, {input: {string1: 'Hello '}})

    expect(resolvedTemplate).toBe('Hello World!')
  })
})

/**
 *  !empty tests
 */
describe('!empty()', () => {
  it('should return true for non-empty strings', () => {
    const template = '${{ .input.string | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: 'Hello World!'}})

    expect(resolvedTemplate).toBe(true)
  })

  it('should return false for empty strings', () => {
    const template = '${{ .input.string | !empty }}'
    const resolvedTemplate = resolveTemplate(template, {input: {string: ''}})

    expect(resolvedTemplate).toBe(false)
  })
})

/**
 *  type() tests
 */
describe('type testing with type()', () => {
  test('should return true for null', () => {
    const template = "${{ .input.value | type('null') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        value: null,
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  test('should return true for undefined', () => {
    const template = "${{ .input.value | type('undefined') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        value: undefined,
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  test('should return true for array input', () => {
    const template = "${{ .input.locations | type('array') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        locations: ['New York', 'Los Angeles', 'Chicago'],
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  test('should return false for non-array input', () => {
    const template = "${{ .input.name | type('array') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        name: 'John Doe',
      },
    })

    expect(resolvedTemplate).toBe(false)
  })

  test('should return true for objects', () => {
    const template = "${{ .input.user | type('object') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        user: {
          id: 1,
          name: 'John Doe',
        },
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  test('should return false for non-object input', () => {
    const template = "${{ .input.name | type('object') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        name: 'John Doe',
      },
    })

    expect(resolvedTemplate).toBe(false)
  })

  test('should return true for strings', () => {
    const template = "${{ .input.name | type('string') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        name: 'John Doe',
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  // booleans
  test('should return true for booleans', () => {
    const template = "${{ .input.isActive | type('boolean') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        isActive: true,
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  // dates
  test('should return true for dates', () => {
    const template = "${{ .input.createdAt | type('date') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        createdAt: new Date('2023-01-01'),
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  // numbers
  test('should return true for numbers', () => {
    const template = "${{ .input.age | type('number') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        age: 30,
      },
    })

    expect(resolvedTemplate).toBe(true)
  })

  test('return false when input is null or undefined (objects)', () => {
    const template = "${{ .input.name | type('object') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        name: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          name: undefined,
        },
      }),
    ).toBe(false)
  })

  test('return false when input is null or undefined (arrays)', () => {
    const template = "${{ .input.locations | type('array') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        locations: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          locations: undefined,
        },
      }),
    ).toBe(false)
  })

  test('return false when input is null or undefined (strings)', () => {
    const template = "${{ .input.name | type('string') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        name: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          name: undefined,
        },
      }),
    ).toBe(false)
  })

  test('return false when input is null or undefined (booleans)', () => {
    const template = "${{ .input.isActive | type('boolean') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        isActive: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          isActive: undefined,
        },
      }),
    ).toBe(false)
  })

  test('return false when input is null or undefined (dates)', () => {
    const template = "${{ .input.createdAt | type('date') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        createdAt: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          createdAt: undefined,
        },
      }),
    ).toBe(false)
  })

  test('return false when input is null or undefined (numbers)', () => {
    const template = "${{ .input.age | type('number') }}"
    const resolvedTemplate = resolveTemplate(template, {
      input: {
        age: null,
      },
    })

    expect(resolvedTemplate).toBe(false)
    expect(
      resolveTemplate(template, {
        input: {
          age: undefined,
        },
      }),
    ).toBe(false)
  })
})
