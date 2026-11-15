// src/lib/services/collector/apiConnector.ts
import { Connector } from "./connector";

export class ApiConnector implements Connector {
  constructor(private sourceConfig: any) {}

  async discover(): Promise<string[]> {
    // Assume config.endpoints is an array of URLs returning a list of IDs
    const ids: string[] = [];
    for (const ep of this.sourceConfig.endpoints || []) {
      try {
        const res = await fetch(ep);
        const data = await res.json();
        if (Array.isArray(data)) ids.push(...data.map((d) => d.id || d));
      } catch {
        // ignore failures – collector will log
      }
    }
    return ids;
  }

  async fetch(listingId: string): Promise<{ rawJson: any; sourceUrl: string }> {
    // Simple GET to `${baseUrl}/${listingId}`
    const url = `${this.sourceConfig.baseUrl}/${listingId}`;
    const res = await fetch(url);
    const json = await res.json();
    return { rawJson: json, sourceUrl: url };
  }
}
