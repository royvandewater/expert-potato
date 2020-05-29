import { formatISO } from 'date-fns'
import { EventEmitter } from 'events'
import * as R from 'ramda'
import * as crypto from 'crypto'

interface Message {
  timestamp: string;
  author: string;
  text: string;
}

interface Entry {
  type: 'node' | 'message';
  data: string[] | Message;
}

interface Entries {
  [key: string]: Entry
}

function toPairs<T>(things: T[]): T[][] {
  const pairs = [] as T[][];


  for (let i = 0; i < things.length; i += 2) {
    const pair = [] as T[]
    const first = R.nth(i, things)
    const second = R.nth(i + 1, things)

    if (first) pair.push(first)
    if (second) pair.push(second)

    pairs.push(pair)
  }

  return pairs
}

function hashObject(obj: object): string {
  const str = JSON.stringify(obj)

  return crypto.createHash('sha1').update(str).digest('hex')
}

class Connection extends EventEmitter {
  private readonly bus: EventEmitter;
  public readonly index: number;
  private readonly messages: Message[];
  private entries: Entries;

  constructor({bus, index}: {bus: EventEmitter, index:number}) {
    super()
    this.bus = bus 
    this.index = index 
    this.messages = [];
    this.entries = {};
    this.bus.on('root', this.onRoot)
    this.bus.on('query', this.onQuery)
    this.bus.on('node', this.onNode)
    this.bus.on('message', this.onMessage)
  }

  sendMessage = (text: string) => {
    const message: Message = {
      timestamp: formatISO(Date.now()), 
      author:`connection ${this.index}`, 
      text,
    }

    this.messages.push(message)
    this.emit('messages:changed', R.clone(this.messages))
    this.sync();
  }

  private rootHash = () => {
    this.entries = {}

    this.messages.forEach(message => {
      const hash = hashObject(message)
      this.entries[hash] = {type: 'message', data: message}
    })

    const hashes = R.keys(this.entries) as string[]
    return this.merkle(hashes)
  }

  private merkle = (hashes: string[]): string | null => {
    if (R.length(hashes) === 0) return null;
    if (R.length(hashes) === 1) return hashes[0];

    const pairs = toPairs(hashes)

    const newHashes = [] as string[]

    pairs.forEach(pair => {
      const hash = hashObject(pair)
      this.entries[hash] = {type: 'node', data: pair}
      newHashes.push(hash)
    })

    return this.merkle(newHashes)
  }


  private onRoot = (root: string) => {
    if (root === this.rootHash()) return;
    this.bus.emit('query', root);
  }

  private onQuery = (hash: string) => {
    const node = this.entries[hash]

    if (!node) return;
    if (node.type === 'node') return this.bus.emit('node', node.data)
    if (node.type === 'message') return this.bus.emit('message', node.data)
  }

  private onNode = (leaves: string[]) => {
    leaves.forEach(leaf => {
      if (this.entries[leaf]) return;

      this.bus.emit('query', leaf)
    })
  }

  private onMessage = (message: Message) => {
    if (R.any(R.equals(message), this.messages)) return;
    this.messages.push(message)
    this.messages.sort()
    this.emit('messages:changed', R.clone(this.messages))
  }

  private sync = () => {
    const root = this.rootHash()
    this.log('emitting root', {root, entries: this.entries})
    this.bus.emit('root', root)
  }

  private log = (...message: any[]) => {
    console.log(`connection(${this.index})`, ...message)
  }
}

export default Connection