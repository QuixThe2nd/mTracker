export interface Config {
  trackerLists: string[];
  discoverTrackersInterval: number;
  httpTimeout: number;
  httpPort: number;
  udpPort: number;
  dhtPort: number;
  dhtConcurrency: number;
  enableHTTP: boolean;
  enableUDP: boolean;
  enableDHT: boolean;
}