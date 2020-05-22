import React from 'react';
import * as R from 'ramda'
import { EventEmitter } from 'events'
import { formatISO } from 'date-fns'
import './App.css';

interface Message {
  timestamp: string;
  author: string;
  text: string;
}

class Connection extends EventEmitter {
  public readonly index: number;
  private readonly messages: Message[];

  constructor(index:number) {
    super()
    this.index = index 
    this.messages = [];
  }

  onMessage = (message: Message) => {
    this.messages.push(message)

    this.emit('messages:changed', R.clone(this.messages))
  }

  sendMessage = (text: string) => {
    const message: Message = {
      timestamp: formatISO(Date.now()), 
      author:`connection ${this.index}`, 
      text,
    }

    this.emit('message', message)
  }
}

const createConnections = () => {
  const connections = R.times(i => new Connection(i), 3)

  connections.forEach(connection => {
    const otherConnections = R.without([connection], connections)
    otherConnections.forEach(otherConnection => {
      otherConnection.on('message', connection.onMessage)
    })
  })

  return connections
}

interface ConnectionProps {
  connection: Connection;
  messages: Message[];
}

const ConnectionSection = ({connection, messages}: ConnectionProps) => {
  const input = React.useRef<HTMLInputElement>(null)

  const sendMessage = () => {
    if (!input.current) return
    connection.sendMessage(input.current.value)
  }

  return (
    <section className="ConnectionSection">
      <h1>Connection: {connection.index}</h1>
      <div>
        <input ref={input} type="text" />
        <button type="button" onClick={sendMessage}>Send</button>
      </div>
      <h2>Messages</h2>
      <table className="Messages">
        <tbody>
          {messages.map(({timestamp, author, text}, i) => (
            <tr key={i}>
              <td>{timestamp}</td>
              <td>{author}</td>
              <td>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

interface MessageLogItem {
  index: number;
  messages: Message[];
}

function App() {
  const connections = React.useMemo(() => createConnections(), []);
  const [messageLog, setMessageLog] = React.useState<MessageLogItem[]>(connections.map(({index}) => ({index, messages: []}))) 

  React.useEffect(() => {
    connections.forEach(connection => {
      connection.on('messages:changed', messages => {
        const { index } = connection

        setMessageLog(messageLog => R.update(index, { index, messages }, messageLog))
      })
    })

    return () => {
      connections.forEach(connection => connection.removeAllListeners())
    }
  }, [connections])

  return (
    <div className="App">
      {connections.map(connection => (
        <ConnectionSection 
          key={connection.index} 
          connection={connection} 
          messages={messageLog[connection.index].messages} />
      ))}
    </div>
  );
}

export default App;
