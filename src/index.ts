import startHTTPTracker from './trackers/HTTP';
import UDPTrackerServer from './trackers/UDP';
import TrackerStats, { type Stats } from './utils/TrackerStats';
import chalk from 'chalk';

const trackers = new TrackerStats("./trackers.json");

const args: string[] = [];
process.argv.forEach(val => args.push(val));
if (args[2] === '--stats')  {
  const stats: Record<string, Stats> = {};
  for (const tracker of trackers.keys()) {
    stats[tracker] = trackers.get(tracker)!;
  }
  const tableData = Object.entries(stats)
    .filter(tracker => tracker[1].success + tracker[1].fail !== 1)
    .sort((a, b) => (b[1].success - b[1].fail) - (a[1].success - a[1].fail))
    .sort((a, b) => (b[1].success / (b[1].success + b[1].fail)) - (a[1].success / (a[1].success + a[1].fail)))
    .map(([tracker, data]) => ({
      Tracker: tracker,
      Success: data.success,
      Fail: data.fail,
      "Success Rate": Math.round(100_00 * data.success / (data.success + data.fail))/100 + "%"
    }));

  console.table(tableData);

  console.table([
    {
      Stat: "Known Trackers",
      Value: Object.keys(stats).length
    },
    {
      Stat: "Untested Trackers",
      Value: Object.values(stats).filter(tracker => tracker.success + tracker.fail === 1).length
    },
    {
      Stat: "Dead Trackers",
      Value: Object.values(stats).filter(tracker => tracker.success === 1 && tracker.fail >= 1).length
    },
    {
      Stat: "Avg Tracker Hits",
      Value: Math.round(10*tableData.reduce((total, tracker) => total + parseFloat(tracker['Success Rate'])/100, 0))/10
    }
  ]);

  console.table([
    {
      Stat: "Known Trackers (HTTP)",
      Value: Object.keys(stats).filter(tracker => tracker.startsWith('http')).length
    },
    {
      Stat: "Untested Trackers (HTTP)",
      Value: Object.keys(stats).filter(tracker => tracker.startsWith('http')).map(tracker => stats[tracker]!).filter(tracker => tracker.success + tracker.fail === 1).length
    },
    {
      Stat: "Dead Trackers (HTTP)",
      Value: Object.keys(stats).filter(tracker => tracker.startsWith('http')).map(tracker => stats[tracker]!).filter(tracker => tracker.success === 1 && tracker.fail >= 1).length
    }
  ]);
  process.exit();
}

const originalWarn = console.warn;
console.warn = function(...args) {
  originalWarn(chalk.yellow(...args));
};

console.log("Discovering Trackers");
const trackerLists = ['https://newtrackon.com/api/all', 'https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt', 'https://cf.trackerslist.com/all.txt', 'https://trackers.run/s/rw_ws_up_hp_hs_v4_v6.txt', 'https://torrends.to/torrent-tracker-list/?download=latest'];
Promise.all(trackerLists.map(tracker => fetch(tracker))).then(async responses => {
  let newTrackers = 0;
  for (const response of responses) {
    const trackerList = (await response.text()).split("\n").filter(tracker => tracker !== "");
    for (const tracker of trackerList) {
      try {
        const protocol = new URL(tracker).protocol;
        if (!['http:', 'https:', 'udp:'].includes(protocol)) {
          console.error("Unknown tracker protocol", protocol);
          continue;
        }
        if (!trackers.get(tracker)) {
          trackers.add(tracker);
          newTrackers++;
        }
      } catch (e) {
        console.error('Failed to parse tracker in list', response.url);
      }
    }
  }
  console.log(`Discovered ${newTrackers} Tracker${newTrackers !== 1 ? 's' : ''}`);
});

startHTTPTracker(trackers);
// await UDPTrackerServer.init(trackers);
