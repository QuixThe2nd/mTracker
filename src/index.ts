import startHTTPTracker from './trackers/HTTP';
import UDPTrackerServer from './trackers/UDP';
import TrackerStats from './utils/TrackerStats';
import chalk from 'chalk';

const originalWarn = console.warn;
console.warn = function(...args) {
  originalWarn(chalk.yellow(...args));
};

const trackers = new TrackerStats("./trackers.json")

console.log("Discovering Trackers");
const trackerLists = ['https://newtrackon.com/api/all', 'https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt', 'https://cf.trackerslist.com/all.txt', 'https://trackers.run/s/rw_ws_up_hp_hs_v4_v6.txt', 'https://torrends.to/torrent-tracker-list/?download=latest'];
Promise.all(trackerLists.map(tracker => fetch(tracker))).then(async responses => {
  let newTrackers = 0;
  for (const response of responses) {
    const trackerList = (await response.text()).split("\n").filter(tracker => tracker !== "");
    for (const tracker of trackerList) {
      const protocol = new URL(tracker).protocol;
      if (!['http:', 'https:', 'udp:'].includes(protocol)) {
        console.error("Unknown tracker protocol", protocol);
        continue;
      }
      if (!trackers.get(tracker)) {
        trackers.add(tracker);
        newTrackers++;
      }
    }
  }
  console.log(`Discovered ${newTrackers} Tracker${newTrackers !== 1 ? 's' : ''}`);
});

startHTTPTracker(trackers);
// await UDPTrackerServer.init(trackers);
