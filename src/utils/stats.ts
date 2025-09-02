import type { Stats } from "./utils/TrackerStats";
import type TrackerStats from "./utils/TrackerStats";

export const stats = (trackers: TrackerStats) => {
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
}