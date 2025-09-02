// After changing config, restart mTracker so changes apply.
// This config file is written in JavaScript.
// **If you don't know what you're doing**, use a code editor that will highlight any syntax errors you made.
// If you do know what you're doing, excuse the weird syntax with the commas, they're placed like that to reduce user error.

/****************/
// DO NOT TOUCH //
import type { Config } from "./config_types";
const CONFIG: Config = {
// DO NOT TOUCH //
/****************/


  // URLs of plain text tracker lists
  trackerLists: [
    'https://newtrackon.com/api/all',
    'https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt',
    'https://cf.trackerslist.com/all.txt',
    'https://torrends.to/torrent-tracker-list/?download=latest',
  ]

  // Enabled tracker protocols, by default all are enabled. Set to `false` to disable.
  , enableHTTP: true
  , enableUDP: true

  // Whether or not to use DHT to discover more peers. Set to `false` to disable.
  , enableDHT: true // Default: true

  // Interval to check tracker lists for new trackers (in MS)
  , discoverTrackersInterval: 21_600_000 // Default: Every 6 hours

  // Maximum time to wait before disregarding tracker response (in MS)
  // This number will be the almost exact time mTracker takes to respond to your BitTorrent client, so ensure your BitTorrent client's timeout is larger than this.
  , httpTimeout: 5_000 // Default: 5 seconds

  // This is the port number your HTTP tracker will be available at
  , httpPort: 6969 // Default: 6969

  // This is the port number your UDP tracker will be available at
  , udpPort: 6969 // Default: 6969

  // This is the port number your DHT node will use
  , dhtPort: 20000 // Default: 20000

  // The maximum number of concurrent pending DHT requests
  , dhtConcurrency: 32 // Default: 32


/****************/
// DO NOT TOUCH //
} as const;
export default CONFIG;
// DO NOT TOUCH //
/****************/
