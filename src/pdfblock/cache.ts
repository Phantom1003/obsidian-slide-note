import { LRUCache } from "lru-cache"

export class FileCache {
	map: LRUCache<string, ArrayBuffer>
	pending: Map<string, Promise<ArrayBuffer>>

	constructor(max: number) {
		this.map = new LRUCache<string, string>({ max: max });
		this.pending = new Map();
	}

	async get(path: string): Promise<ArrayBuffer> {
		if (this.map.has(path)) {
			return this.map.get(path);
		}
		else if (this.pending.has(path)) {
			return this.pending.get(path);
		}
		else {
			const buffer = app.vault.adapter.readBinary(path);
			this.pending.set(path, buffer);
			this.map.set(path, await buffer);
			this.pending.delete(path);
			return buffer;
		}
	}
}
