import {FrontMatterCache, MarkdownView, normalizePath, Platform} from "obsidian";
import { isAbsolute } from "path";

export function getFileName(view: MarkdownView, absolute = false): string | undefined {
	const selected: string = view.editor.somethingSelected() ?
		view.editor.getSelection() : view.editor.getLine(view.editor.getCursor("anchor").line);
	const filePath = this.app.workspace.getActiveFile()?.path;
	if (!filePath)
		return undefined;
	const frontmatter = app.metadataCache.getCache(filePath)?.frontmatter ?? {} as FrontMatterCache;
	const lines = selected.split("\n");
	let fileName = frontmatter["default_file"];
	for (let i = 0; i < lines.length; i++) {
		const words = lines[i].trim().split(/:(.*)/s);
		if (words[0] == "file") {
			if (words[1].length != 0)
				fileName = words[1].trim();
			break;
		}
	}

	if (fileName) {
		if (absolute) {
			fileName = Platform.isDesktop && isAbsolute(fileName) ? fileName :
				normalizePath(
					// @ts-ignore
					app.vault.adapter.getBasePath() + "/" +
					app.metadataCache.getFirstLinkpathDest(
						fileName.replace("[[", "").replace("]]", ""),
						"")?.path
				);
		}
		else {
			fileName = app.metadataCache.getFirstLinkpathDest(
				fileName.replace("[[", "").replace("]]", ""),
				"")?.path
		}
	}

	return fileName;
}
