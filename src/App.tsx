import React from 'react';
import * as R from 'ramda'
import './App.css';
import Connection from './Connection'
import { EventEmitter } from 'events';
import { parseISO } from 'date-fns/esm';
import { format } from 'date-fns';

const formatTime = (timestamp: string) => {
  return format(parseISO(timestamp), 'HH:mm:ss')
}

interface Message {
  timestamp: string;
  author: string;
  text: string;
}

interface ConnectionProps {
  connection: Connection;
  messages: Message[];
}

const ConnectionSection = ({connection, messages}: ConnectionProps) => {
  const input = React.useRef<HTMLInputElement>(null)

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.current?.value) return
    connection.sendMessage(input.current.value)
    input.current.value = ""
  }

  return (
    <section className="ConnectionSection">
      <h1>Connection: {connection.index}</h1>
      <div>
        <form onSubmit={sendMessage}>
          <input ref={input} type="text" />
          <button type="submit">Send</button>
        </form>
      </div>
      <h2>Messages</h2>
      <table className="Messages">
        <tbody>
          {messages.map(({timestamp, author, text}, i) => (
            <tr key={i}>
              <td className="Timestamp">{formatTime(timestamp)}</td>
              <td className="Author">{author}</td>
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

const createConnections = () => {
  const bus = new EventEmitter();

  bus.on('root', (message) => console.log('on:root', message))
  bus.on('query', (message) => console.log('on:query', message))
  bus.on('node', (message) => console.log('on:node', message))
  bus.on('message', (message) => console.log('on:message', message));

  (window as any).bus = bus

  return R.times(index => new Connection({bus, index}), 3)
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
