import fs from 'fs';

export interface Stats {
  success: number;
  fail: number;
}

export default class TrackerStats {
  private map: Map<string, Stats>;

  constructor(private path: string) {
    if (!fs.existsSync(path)) fs.writeFileSync(path, '[]', 'utf8');
    this.map = new Map<string, Stats>(JSON.parse(fs.readFileSync(path, 'utf8')))
  }

  public keys = () => this.map.keys();
  public get = (tracker: string) => this.map.get(tracker);
  public add(tracker: string) {
    this.map.set(tracker, { success: 1, fail: 0 });
    fs.writeFileSync(this.path, JSON.stringify([...this.map], null, "\t"), 'utf8');
  }
  public update(tracker: string, state: 'success' | 'fail') {
    const historic = this.map.get(tracker)!;
    historic[state]++;
    this.map.set(tracker, historic);
    fs.writeFileSync(this.path, JSON.stringify([...this.map], null, "\t"), 'utf8');
  }
}
