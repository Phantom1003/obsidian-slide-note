import { Platform } from "obsidian";
import { LRUCache } from "lru-cache";
import { isAbsolute } from "path";
import { readFileSync } from "fs";

export class FileCache {
	map: LRUCache<string, ArrayBuffer>
	pending: Map<string, Promise<ArrayBuffer>>

	constructor(max: number) {
		this.map = new LRUCache<string, string>({ max: max });
		this.pending = new Map();
	}

	async get(path: string): Promise<ArrayBuffer> {
		if (this.map.has(path)) {
			return this.map.get(path).slice(0);
		}
		else if (this.pending.has(path)) {
			const buffer = await this.pending.get(path)
			return buffer.slice(0);
		}
		else {
			const buffer = Platform.isDesktop && isAbsolute(path) ? this.readLocalFile(path) : app.vault.adapter.readBinary(path);
			this.pending.set(path, buffer);
			this.map.set(path, await buffer);
			this.pending.delete(path);
			return this.map.get(path).slice(0);
		}
	}
	invalid(path: string): void {
		this.map.delete(path);
	}

	async readLocalFile(path: string): Promise<ArrayBuffer> {
		const buffer = readFileSync(path);
		var arrayBuffer = new ArrayBuffer(buffer.length);
		var typedArray = new Uint8Array(arrayBuffer);
		for (var i = 0; i < buffer.length; ++i) {
			typedArray[i] = buffer[i];
		}
		return arrayBuffer;
	}
}
