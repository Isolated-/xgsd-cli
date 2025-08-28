import {BinaryToTextEncoding} from 'crypto'
import {decodeString, encodeString} from '../keys/util/format.util'

export type RawData = Buffer

export interface IExportable<T = unknown, Q = RawData> {
  raw(from?: BufferEncoding): Q
  digest(digest?: BinaryToTextEncoding, from?: BufferEncoding): string
  export<R = T>(v?: number, alg?: string): R
}

export type BinaryExportableOpts = {
  v?: number
  alg?: string
}

export class BinaryExportable implements IExportable<string> {
  constructor(private readonly data: string, public readonly opts: BinaryExportableOpts = {}) {}

  public static parseImportString(importString: string): BinaryExportable {
    const decoded = decodeString(importString, 'base64url')
    return new BinaryExportable(decoded.key, {v: decoded.v, alg: decoded.alg})
  }

  raw(from: BufferEncoding = 'base64url'): RawData {
    return Buffer.from(this.data, from)
  }

  digest(digest: BinaryToTextEncoding = 'base64url', from: BufferEncoding = 'base64url'): string {
    return this.raw(from).toString(digest)
  }

  export<R = string>(v?: number, alg?: string): R {
    return encodeString(this.data, v ?? this.opts.v, alg ?? this.opts.alg) as R
  }
}
