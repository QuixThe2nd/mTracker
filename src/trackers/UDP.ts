import dgram from 'dgram';
import type TrackerStats from '../utils/TrackerStats';

const actions = {
  connect: 0,
  announce: 1,
  error: 3
} as const;

const pendingRequests = new Map<number, { announceBuffer: Buffer, clientRinfo: dgram.RemoteInfo }>();

type Sockets = {
  server: dgram.Socket;
  client: dgram.Socket;
};

const sockets: Sockets = {
  client: dgram.createSocket('udp4'),
  server: dgram.createSocket('udp4')
};

export default class UDPTrackerServer {
  private protocolID = BigInt('0x41727101980');

  private constructor(private trackers: TrackerStats) {
    sockets.server.on('message', (msg, rinfo) => {
      if (msg.length === 16) this.handleConnect(msg, rinfo);
      else if (msg.length >= 98) this.handleRequest(msg, rinfo);
      else console.error(`UDP:  Unknown packet (${msg.length} bytes):`, msg.toString('hex'));
    });
    new UDPTrackerClient();
  }

  static init = (trackers: TrackerStats) => new Promise<UDPTrackerServer>((resolve) => {
    const server = new UDPTrackerServer(trackers);
    sockets.server.bind(6969, () => {
      console.log('UDP:  Tracker listening at udp://localhost:6969/announce')
      resolve(server);
    });
  });

  handleConnect = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    const transactionId = msg.readUInt32BE(12);
    const connectionId = BigInt(Date.now());

    const response = Buffer.alloc(16);
    response.writeUInt32BE(actions.connect, 0);
    response.writeUInt32BE(transactionId, 4);
    response.writeBigUInt64BE(connectionId, 8);

    sockets.server.send(response, rinfo.port, rinfo.address, e => e && console.log('UDP:  Server failed handling connect', e));
    // console.log(`UDP:  New connection with ID ${connectionId}`);
  }

  handleRequest = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    const action = msg.readUInt32BE(8);
    if (action === actions.announce) {
      console.log('UDP:  Handling announce');
      for (const tracker of this.trackers.keys().filter(tracker => tracker.startsWith('udp'))) {
        const history = this.trackers.get(tracker)!;
        const successRate = history.success / (history.success + history.fail);
        if (Math.random() > successRate) continue;
        const url = new URL(tracker);
        const connectBuffer = Buffer.alloc(16);
        const transactionId = Math.floor(Math.random() * 0xFFFFFFFF);

        // Announce
        connectBuffer.writeBigUInt64BE(this.protocolID, 0);
        connectBuffer.writeUInt32BE(actions.connect, 8);
        connectBuffer.writeUInt32BE(transactionId, 12);
        pendingRequests.set(transactionId, { announceBuffer: Buffer.from(msg), clientRinfo: rinfo });

        // Request
        sockets.client.send(connectBuffer, Number(url.port), url.hostname, e => {
          if (e) this.trackers.update(tracker, 'fail');
        });
      }
    } else console.error("UDP:  Unknown action", action)
  }
}

class UDPTrackerClient {
  constructor() {
    sockets.client.on('message', (msg, rinfo) => {
      const action = msg.readUInt32BE(0);
      const transactionId = msg.readUInt32BE(4);

      if (action === actions.connect) this.handleConnect(msg, rinfo, transactionId);
      else if (action === actions.announce) this.handleAnnounce(msg, transactionId);
      else if (action === actions.error) {
        const errorMessage = msg.slice(8).toString('utf8');
        console.error(`UDP:  Tracker error: "${errorMessage}"`);
      } else console.error("UDP:  Unknown action", action)
    });
  }

  handleConnect = (msg: Buffer, rinfo: dgram.RemoteInfo, transactionId: number) => {
    const connectionId = msg.readBigUInt64BE(8);
    const request = pendingRequests.get(transactionId);
    
    if (!request) return console.error("UDP:  Can't find request");
    const announceBuffer = Buffer.from(request.announceBuffer);
    const announceTransactionId = Math.floor(Math.random() * 0xFFFFFFFF);

    pendingRequests.delete(transactionId);
    pendingRequests.set(announceTransactionId, request);

    announceBuffer.writeBigUInt64BE(connectionId, 0);
    announceBuffer.writeUInt32BE(announceTransactionId, 12);

    sockets.client.send(announceBuffer, rinfo.port, rinfo.address, e => e && console.log('UDP:  Client failed handling connect', e));
    // console.log('UDP:  Sent announce request with connection ID');
  }

  handleAnnounce = (msg: Buffer, transactionId: number) => {
    const request = pendingRequests.get(transactionId);
    if (request) {
      pendingRequests.delete(transactionId);

      if (msg.length < 20) return console.error('UDP:  Message too small to contain peers', msg);
      else {
        const peerCount = (msg.length - 20) / 6;
        if (peerCount === 0) return;
        console.log(`UDP:  Found ${peerCount} peer${peerCount !== 1 ? 's' : ''}`);
      }

      const responseBuffer = Buffer.from(msg);
      const originalTransactionId = request.announceBuffer.readUInt32BE(12);
      responseBuffer.writeUInt32BE(originalTransactionId, 4);

      sockets.server.send(responseBuffer, request.clientRinfo.port, request.clientRinfo.address, e => e && console.log('UDP:  Client failed handling announce', e));
      // console.log(`UDP:  Forwarded response back to qBittorrent with original transaction ID: ${originalTransactionId}`);
    }
  }
}
