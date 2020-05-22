import React from 'react';
import * as R from 'ramda'
import { EventEmitter } from 'events'
import './App.css';

class Connection extends EventEmitter {
  public readonly index: number;
  private readonly messages: string[];

  constructor(index:number) {
    super()
    this.index = index 
    this.messages = [];
  }

  onMessage = (message: string) => {
    this.messages.push(message)

    this.emit('messages:changed', R.clone(this.messages))
  }

  sendMessage = (message: string) => {
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

interface MessageLogItem {
  index: number;
  messages: string[];
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
        <section key={connection.index}>
          <h1>Connection: {connection.index}</h1>
          <button type="button" onClick={() => connection.sendMessage('Hi!')}>Say Hi!</button>
          <h2>Messages</h2>
          <ul>
            {messageLog[connection.index].messages.map((message, i) => <li key={i}>{message}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default App;
