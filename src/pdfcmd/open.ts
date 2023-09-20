import { MarkdownView, normalizePath, Notice, Platform} from "obsidian";
import { exec } from "child_process";
import { isAbsolute } from "path";
import { getFileName } from "./utils";

export function openPDFwithLocal(view: MarkdownView) {
	try {
		const selected: string = view.editor.somethingSelected() ?
			view.editor.getSelection() : view.editor.getLine(view.editor.getCursor("anchor").line);
		const fileName = getFileName(selected);

		if (fileName) {
			const openCommand = Platform.isWin ? 'start ""' : Platform.isLinux ? "xdg-open" : "open";
			const fullPath = isAbsolute(fileName) ? fileName :
				normalizePath(
					app.vault.adapter.getBasePath() + "/" +
					app.metadataCache.getFirstLinkpathDest(
						fileName.replace("[[", "").replace("]]", ""), 
						"")?.path
				);
			const cmd = `${openCommand} "${fullPath}"`
			exec(cmd, (error, stdout, stderr) => {
				if (error) {
					throw new Error(`${error}, ${stdout}, ${stderr}`);
				}
				new Notice(`[SlideNote] Open ${fullPath}`);
			})

		}
		else {
			throw new Error("Unable to find a file name to open.");
		}
	} catch (e) {
		new Notice("[SlideNote] Failed: " + e.message);
	}
}
