import { FrontMatterCache } from "obsidian";

export function getFileName(selected: string): string | undefined {
	const filePath = this.app.workspace.getActiveFile()?.path;
	if (!filePath)
		return undefined;
	const frontmatter = app.metadataCache.getCache(filePath)?.frontmatter ?? {} as FrontMatterCache;
	const lines = selected.split("\n");
	let fileName = frontmatter["default_file"] as string;
	for (let i = 0; i < lines.length; i++) {
		const words = lines[i].trim().split(/:(.*)/s);
		if (words[0] == "file") {
			if (words[1].length != 0)
				fileName = words[1].trim();
			break;
		}
	}
	return fileName;
}
