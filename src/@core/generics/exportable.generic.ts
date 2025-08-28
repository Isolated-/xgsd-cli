import {BinaryToTextEncoding} from 'crypto'
import {decodeString, encodeString} from '../keys/util/format.util'

export type RawData = Buffer

export interface IExportable<T = unknown, Q = RawData> {
  raw(from?: BufferEncoding): Q
  digest(digest?: BinaryToTextEncoding, from?: BufferEncoding): string
  export<R = T>(format?: 'raw' | 'import' | 'pem'): R
}

export type BinaryExportableOpts = {
  v?: number
  alg?: string
}

export function toPEM(data: Buffer | string, label: string = 'DATA'): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const b64 = buf.toString('base64')

  // wrap at 64 characters
  const wrapped = b64.match(/.{1,64}/g)?.join('\n') ?? b64

  return [`-----BEGIN ${label}-----`, wrapped, `-----END ${label}-----`].join('\n')
}

export function fromPEM(pem: string): Buffer {
  // remove header/footer
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')

  return Buffer.from(base64, 'base64')
}

export class BinaryExportable implements IExportable<string> {
  constructor(private readonly data: string, public readonly opts: BinaryExportableOpts = {}) {}

  public static parseImportString(importString: string, format: 'import' | 'pem' = 'import'): BinaryExportable {
    let string = importString
    if (format === 'pem') {
      string = fromPEM(importString).toString('base64url')
    }

    const decoded = decodeString(importString, 'base64url')

    return new BinaryExportable(decoded.key, {v: decoded.v, alg: decoded.alg})
  }

  raw(from: BufferEncoding = 'base64url'): RawData {
    return Buffer.from(this.data, from)
  }

  digest(digest: BinaryToTextEncoding = 'base64url', from: BufferEncoding = 'base64url'): string {
    return this.raw(from).toString(digest)
  }

  export<R = string>(format: 'import' | 'pem' = 'import'): R {
    const encoded = encodeString(this.data, this.opts.v, this.opts.alg) as string

    if (format === 'import') {
      return encoded as R
    }

    return toPEM(encodeString(this.data, this.opts.v, this.opts.alg)) as R
  }
}
