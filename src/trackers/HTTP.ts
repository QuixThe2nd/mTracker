import bencode from 'bencode';
import z from "zod";
import type TrackerStats from '../utils/TrackerStats';

const TrackerResponseSchema = z.object({
  complete: z.number().int().nonnegative(),
  incomplete: z.number().int().nonnegative(),
  interval: z.number().int().positive(),
  'min interval': z.number().int().positive(),
  peers: z.array(z.object({
    'peer id': z.string(),
    ip: z.string(),
    port: z.number().int().min(1).max(65535)
  }))
});

type TrackerResponse = z.infer<typeof TrackerResponseSchema>;

class HTTPTracker {
  private timeout = 5_000;

  constructor(private trackers: TrackerStats) {}

  private announce = async (tracker: string, query: string) => {
    const result = await new Promise<TrackerResponse | false>(async (resolve) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
        resolve(false)
      }, this.timeout)
      try {
        const res = await fetch(`${tracker}?${query}`, { signal: controller.signal });
        if (!res.ok) return resolve(false);
        const buffer = Buffer.from(await res.arrayBuffer());
        try {
          const decoded = bencode.decode(buffer, 'utf8');
          const response = TrackerResponseSchema.safeParse(decoded);
          if (response.success) return resolve(response.data);
        } catch (e) {
          if (buffer.toString().includes('<html>')) console.error('HTTP: Tracker responded with HTML');
          else console.error('HTTP:', e, buffer.toString());
        }
      } catch (e) {
        const err = e as { code: string, path: string, errno: number, name?: string };
        if (err.code === "ABORT_ERR" || err.name === "AbortError") console.error(tracker, "Request timed out");
        else if (err.code === "ConnectionRefused") console.error(tracker, "Connection refused by tracker");
        else if (err.code === "FailedToOpenSocket") console.error(tracker, "Failed to connect to tracker");
        else if (err.code === "ECONNRESET") console.error(tracker, "Connection was interrupted");
        else if (err.code === "ERR_TLS_CERT_ALTNAME_INVALID") console.error(tracker, "SSL validation error");
        else if (err.code === "UNKNOWN_CERTIFICATE_VERIFICATION_ERROR") console.error(tracker, "Unknown SSL error");
        else if (err.code === "CERT_HAS_EXPIRED") console.error(tracker, "SSL Certificate expired");
        else console.error('HTTP:', err);
      }
      return resolve(false);
    });
    this.trackers.update(tracker, result === false ? 'fail' : 'success');
    return result;
  }

  public announceAll = async (search: Map<string, string>): Promise<TrackerResponse> => {
    console.log("HTTP: Handling announce");
    search.set("compact", "0");
    search.set("info_hash", search.get("info_hash")?.toString()!);

    const announces = [];
    for (const tracker of this.trackers.keys().filter(tracker => tracker.startsWith('http'))) {
      const history = this.trackers.get(tracker)!;
      const successRate = history.success / (history.success + history.fail);
      if (Math.random() < successRate) announces.push(this.announce(tracker, Array.from(search).map(([k, v]) => `${k}=${v}`).join('&')));
    }
    const responses = (await Promise.all(announces)).filter(res => res !== false);

    if (responses.length === 0) return { complete: 0, incomplete: 0, interval: 10, "min interval": 10, peers: [] }

    const peers = [...new Map(responses.map(response => response.peers).flat().map(obj => [`${obj.ip}:${obj.port}`, obj])).values()];

    console.log(`HTTP: Found ${peers.length} peer${peers.length !== 1 ? 's' : ''}`);

    return {
      complete: Math.max(...responses.map(response => response.complete)),
      incomplete: Math.max(...responses.map(response => response.incomplete)),
      interval: Math.ceil(responses.map(response => response.interval).reduce((acc, v) => acc + v, 0) / responses.length),
      "min interval": Math.ceil(responses.map(response => response["min interval"]).reduce((acc, v) => acc + v, 0) / responses.length),
      peers
    }
  }
}

const startHTTPTracker = (trackers: TrackerStats) => {
  const tracker = new HTTPTracker(trackers);
  const announce = async (req: Request) => {
    const params = new Map<string, string>();
    req.url.split('?')[1]?.split('&').forEach(pair => params.set(...pair.split('=') as [string, string]));
    return new Response(bencode.encode(await tracker.announceAll(params)));
  }
  Bun.serve({ port: 6969, routes: { "/announce": announce } });
  console.log('HTTP: Tracker listening at http://localhost:6969/announce');
  return tracker;
}
export default startHTTPTracker;
