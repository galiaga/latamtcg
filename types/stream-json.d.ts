declare module 'stream-chain' {
  import { Transform, Readable, Writable } from 'stream'
  export function chain(transforms: (Transform | Readable | Writable)[]): Transform
  const _default: { chain: typeof chain }
  export default _default
}

declare module 'stream-json' {
  import { Transform } from 'stream'
  export function parser(options?: unknown): Transform
  const _default: { parser: typeof parser }
  export default _default
}

declare module 'stream-json/streamers/StreamArray' {
  import { Transform } from 'stream'
  export function streamArray(options?: unknown): Transform
  const _default: { streamArray: typeof streamArray }
  export default _default
}


