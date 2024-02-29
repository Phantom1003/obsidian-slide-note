import { MarkdownView, Notice, Platform} from "obsidian";
import { exec } from "child_process";
import { getFileName } from "./utils";

export function openPDFwithLocal(view: MarkdownView) {
	try {
		const fileName = getFileName(view, true);

		if (fileName) {
			const openCommand = Platform.isWin ? 'start ""' : Platform.isLinux ? "xdg-open" : "open";
			const cmd = `${openCommand} "${fileName}"`
			exec(cmd, (error, stdout, stderr) => {
				if (error) {
					throw new Error(`${error}, ${stdout}, ${stderr}`);
				}
				new Notice(`[SlideNote] Open ${fileName}`);
			})

		}
		else {
			throw new Error("Unable to find a file name to open.");
		}
	} catch (e) {
		new Notice("[SlideNote] Failed: " + e.message);
	}
}
