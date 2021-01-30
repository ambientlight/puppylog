import { Client, Notification } from "pg"
import { EventEmitter } from "events"
import { create } from "domain"

const RESERVED_CHANNELS = ['newListener', 'removeListener', 'notify', 'unlisten', 'listen', 'error', 'end']

/***
 * slightly tuned pg-ipc, with _dispatchUnlisten typo fix, setMaxListener and addListener instead on for pg notification
 */
export const createPgEventEmitter = (client: Client): EventEmitter => {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(0)
  let ending = false

  emitter.on('newListener', function (channel: string) {
    if (RESERVED_CHANNELS.indexOf(channel) < 0 && emitter.listenerCount(channel) === 0) {
      _dispatchListen(channel)
    }
  })

  emitter.on('removeListener', function (channel: string) {
    if (RESERVED_CHANNELS.indexOf(channel) < 0 && emitter.listenerCount(channel) === 0) {
      _dispatchUnlisten(channel)
    }
  })

  const _pgNotificationListener = (msg: Notification) => {
    try {
      if(msg.payload){
        msg.payload = JSON.parse(msg.payload)
      } else {
        console.warn(`Empty payload recieved from channel ${msg.channel}`)
      }
    } catch (ex) {}
    finally {
      emitter.emit(msg.channel, msg)
    }
  }

  client.addListener('notification', _pgNotificationListener);

  (emitter as any).send = (emitter as any).notify = function (channel: string, payload: any) {
    let encodedPayload
    if (payload != null){
      encodedPayload = typeof payload !== 'string' ? JSON.stringify(payload) : payload
    }

    const statement = `NOTIFY ${client.escapeIdentifier(channel)}` + (encodedPayload != null ? `, ${client.escapeLiteral(encodedPayload)}` : '')

    client.query(statement, function (err) {
      if (err) return emitter.emit('error', err)
      emitter.emit('notify', channel, payload)
    })
  };

  (emitter as any).end = function () {
    if (ending) return
    ending = true
    if ((client as any).connection.stream.readyState === 'open') return client.query(`UNLISTEN *`, _end)
    else return _end()

    function _end (err?: any) {
      if (err) {
        ending = false
        return emitter.emit('error', err)
      }
      emitter.emit('end')
      emitter.removeAllListeners()
      client.removeListener('notification', _pgNotificationListener)
    }
  }

  return emitter

  function _dispatchListen (channel: string) {
    console.log(`LISTEN ${channel}`)
    client.query(`LISTEN ${client.escapeIdentifier(channel)}`, function (err, result) {
      if (err) return emitter.emit('error', err)
      emitter.emit('listen', channel)
    })
  }

  function _dispatchUnlisten (channel: string) {
    console.log(`UNLISTEN ${channel}`)
    client.query(`UNLISTEN ${client.escapeIdentifier(channel)}`, function (err) {
      if (err) return emitter.emit('error', err)
      emitter.emit('unlisten', channel)
    })
  }
}