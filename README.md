# mTracker - Beta
A BitTorrent meta-tracker that aggregates multiple public trackers into a single reliable tracker. mTracker also allows for users with both public and private torrents to discover peers via DHT & PeX without enabling it on their client. 

## Features
- **Single Tracker Setup**: Replaces all public trackers in your BitTorrent client
- **Automatic Tracker Discovery**: Pulls trackers from tracker lists
- **No Required Config**: Works out of the box with only optional configuration
- **Safe DHT & PeX**: Handles DHT and PeX without contaminating private torrents
- **Multi Protocol Support**: HTTP/HTTPS & UDP tracker protocols
- **Response Aggregation**: Combines peer lists from multiple sources
- **Health Monitoring**: Bad trackers are checked less frequently overtime

## How it Works
mTracker acts as a proxy between your BitTorrent client and the broader peer discovery ecosystem:
1. **Tracker Discovery**: mTracker checks third parties for lists of trackers and saves all discovered trackers.
2. **Tracker Health**: Bad trackers are queried less frequently, proportional to their past success rate.
3. **Request Forwarding**: When your client requests a list of peers from mTracker, mTracker forwards the request to all healthy trackers.
4. **Response Aggregation**: Peer lists are de-duplicated, with the maximum seed/leech statistics returned to your client.
5. **Unified Response**: Returns a single comprehensive response to your client.
6. **DHT Support**: Torrents are looked up in the DHT network and returned via HTTP announces, with DHT announces handled on your clients behalf.
6. Soon: PeX integration

## Installation
[Install Bun](https://bun.com/docs/installation)

```bash
# Clone mTracker
git clone https://github.com/QuixThe2nd/mTracker
cd mTracker

# Install dependencies
bun install

# Run mTracker
bun src/index.ts
```

## Usage
### Start mTracker
Run the following:
```bash
bun src/index.ts
```
**This doesn't daemonise mTracker.**

### Using mTracker
Select all your public torrents and replace all trackers with only these 2:
```
http://localhost:6969/announce
udp://localhost:6969/announce
```
Remember to update your BitTorrent settings to set these trackers to automatically add to new torrents.

> [!WARNING]
> **On first run** mTracker utilises every tracker it is aware of, many of these trackers will fail. Expect a flood of warnings when mTracker is newly setup, they will progressively decrease. If there are 100 dead trackers, on first run you'll get 100 errors, on second run you'll get 50 errors, on third run you'll get 33 errors, etc. Read about [Polling Rates](#polling-rates--tracker-health) to understand how this works.

### Disabling DHT
In your BitTorrent client, globally disable DHT. mTracker handles DHT on your clients behalf making DHT redundant.

> [!WARNING]
> **Don't add private torrents** mTracker is designed for public torrents only. Announcing a private torrent to mTracker will result in it being leaked to the DHT network and could get you banned from your private tracker.

## Configuration
All configuration is optional, mTracker works out of the box. To change your config, go to `./config.ts`. Explanations of all values are alongside the config.

## Insights
The get statistics including a list of known trackers and their success rates, run:
```
bun src/index.ts --stats
```

## Polling Rates & Tracker Health
Tracker success rates are used to decide how often to poll the tracker. If a tracker has a 90% uptime, there is a 90% chance the tracker will be checked in each announce, whereas a tracker with a 5% uptime will only be called for 5% of announces.

New trackers are initially credited with 1 success and 0 failures, giving the tracker a 100% success rate. This means when the next announce is made, it is guaranteed that the tracker will be checked against. If the tracker fails after it's first check, it will now have 1 success and 1 failure associated to it, giving it a 50% chance of being checked next announce. Given enough times, dead trackers will be checked almost never.

## TODO
### Peer & Metadata Discovery
- PeX
- BEP33 scrape requests
### Configuration
- bind to configurable host
### Efficiency
- Re-use UDP connections
- honour trackers' minimum intervals
### Protocols
- Finish UDP health monitoring
  - log UDP success
  - log UDP timeouts as failures
- WebSocket tracker support
