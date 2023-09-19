import { MarkdownView, normalizePath, Notice, Platform} from "obsidian";
import { exec } from "child_process";
import { isAbsolute } from "path";

export function openPDFwithLocal(view: MarkdownView) {
	try {
		const filePath = this.app.workspace.getActiveFile()?.path;
		if (!filePath)
			throw new Error("No open file!");
		const frontmatter = app.metadataCache.getCache(filePath)?.frontmatter ?? {};

		const selected: string = view.editor.somethingSelected() ? 
			view.editor.getSelection() : "";

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
			const openCommand = Platform.isWin ? 'start ""' : Platform.isLinux ? "xdg-open" : "open";
			const fullPath = isAbsolute(fileName) ? fileName :
				normalizePath(
					app.vault.adapter.getBasePath() + "/" +
					app.metadataCache.getFirstLinkpathDest(
						fileName.replace("[[", "").replace("]]", ""), 
						"")?.path
				);
			const cmd = `${openCommand} "${fullPath}"`

			console.log(cmd)
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
