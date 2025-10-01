declare module 'stream-json' {
  import { Transform } from 'stream'
  export function parser(options?: unknown): Transform
  const _default: { parser: typeof parser }
  export default _default
}

declare module 'stream-json/streamers/StreamArray' {
  import { Transform } from 'stream'
  export function withParser(options?: unknown): Transform
  const _default: { withParser: typeof withParser }
  export default _default
}


