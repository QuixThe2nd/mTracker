// Peers discovered through DHT are served via the HTTP tracker
import fs from 'fs';
import DHT from 'bittorrent-dht';
import CONFIG from '../../config';

type Callback = (peer: { ip: string; port: number }) => void;
export interface DHTServer {
  lookup: (infohash: string, port: number, callback: Callback) => void
};

export const startDHTServer = () => new Promise<DHTServer>(resolve => {
  if (!CONFIG.enableDHT) return resolve({ lookup: () => {} });

  const listeners: Record<string, { peers: string[]; callback: Callback }> = {};

  const dht = new DHT({ concurrency: CONFIG.dhtConcurrency });
  dht.on('peer', (peer: { host: string; port: string }, infoHash: Buffer) => {
    const peerString = `${peer.host}:${peer.host}`;
    const listener = listeners[infoHash.toString('hex')];
    if (!listener?.peers.includes(peerString)) {
      listener?.peers.push(peerString);
      listener?.callback({ ip: peer.host, port: Number(peer.port) });
    }
  });

  dht.listen(CONFIG.dhtPort, () => {
    const address = dht.address() as { address: string; port: number };
    console.log(`DHT:  Listening at ${address.address}:${address.port}`);

    // Save Peers
    if (!fs.existsSync('store/dht_nodes.json')) fs.writeFileSync('store/dht_nodes.json', '[]');
    const nodes = JSON.parse(fs.readFileSync('store/dht_nodes.json').toString()) as { host: string; port: number }[];
    nodes.forEach(node => dht.addNode(node));
    setInterval(() => {
      fs.writeFileSync('store/dht_nodes.json', JSON.stringify(dht.toJSON().nodes));
    }, 60_000);
  });

  dht.on('ready', () => {
    console.log('DHT:  Ready')
    resolve({
      lookup: (infohash: string, port: number, callback: Callback) => {
        console.log('DHT:  Handling announce');
        listeners[infohash] = { callback, peers: [] };
        dht.lookup(infohash);
        dht.announce(infohash, port);
      }
    });
  });

  dht.on('error', console.error);
});
