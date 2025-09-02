import { startDHTServer } from './trackers/DHT';
import startHTTPTracker from './trackers/HTTP';
import UDPTrackerServer from './trackers/UDP';
import TrackerStats from './utils/TrackerStats';
import chalk from 'chalk';
import CONFIG from '../config.ts';
import { discoverTrackers } from './utils/discoverTrackers.ts';
import { stats } from './utils/stats.ts';

const trackers = new TrackerStats("./store/trackers.json");

const args: string[] = [];
process.argv.forEach(val => args.push(val));
if (args[2] === '--stats')  {
  stats(trackers);
  process.exit();
}

const originalWarn = console.warn;
console.warn = (...args) => originalWarn(chalk.yellow(...args));

discoverTrackers(trackers);
setInterval(() => discoverTrackers(trackers), CONFIG.discoverTrackersInterval);

const dht = await startDHTServer();
if (CONFIG.enableHTTP) startHTTPTracker(trackers, dht);
if (CONFIG.enableUDP) await UDPTrackerServer.init(trackers);
