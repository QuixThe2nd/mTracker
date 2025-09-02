import CONFIG from "../../config";
import type TrackerStats from "../utils/TrackerStats";

export const discoverTrackers = (trackers: TrackerStats) => {
  console.log("Discovering Trackers");
  Promise.all(CONFIG.trackerLists.map(tracker => fetch(tracker))).then(async responses => {
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
}