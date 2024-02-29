import { App, Modal, Notice, MarkdownView, normalizePath } from 'obsidian';
import { getFileName } from "./utils";

export class SlideNoteCMDModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const container = this.contentEl.createEl("div");
		container.createEl('h2', {text: "SlideNote Block Generator"});
		container.createEl('p', {text: `Current Active File: ${this.app.workspace.getActiveFile()?.path}`});

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view == null) {
			container.createEl('p', {
				text: "Please open a file first",
				attr: {style: "color: red;"}
			});
			return;
		}

		const fileName = getFileName(view.editor.getSelection());
		if (fileName == undefined) {
			container.createEl('p', {
				text: "Please select a Slide Note block, or specify a `default_file` in the frontmatter",
				attr: {style: "color: red;"}
			});
			return;
		}
		container.style.maxHeight = '1000px';
		container.createEl('p', {text: `Target File: ${fileName}`});
		const iframe = container.createEl('iframe');
		iframe.src = this.app.vault.adapter.getResourcePath(normalizePath(fileName));
		iframe.style.width = '100%';
		iframe.style.height = '500px';

		const generate = container.createEl('div');
		generate.style.textAlign = "center";
		const input = generate.createEl("input", {attr: {style: "margin-right: 8px;"}})
		input.placeholder = "enter page range"
		generate.createEl('button', {text: "Generate"}).onclick = (e) => {
			let pages: any[] = []
			const ranges = input.value.trim().split(",");
			console.log(ranges, input.value)
			ranges.forEach((r, i) => {
				if (r.contains("-")) {
					const range = r.split("-");
					if (range.length != 2)
						throw new Notice(r + ": Invalid page range");
					pages = pages.concat(Array.from({ length: parseInt(range[1]) - parseInt(range[0]) + 1 }, (_, i) => parseInt(range[0]) + i));
				}
				else if (!isNaN(parseInt(r))) {
					pages.push(parseInt(r));
				}
			});
			pages.forEach((p, i) => {
				if (view) {
					const template = [
						"",
						"```slide-note",
						`file: ${fileName}`,
						`page: ${p}`,
						"```",
						`^page${p}`,
						"",
						"",
						"---",
						"\n"
					];
					view.editor.replaceSelection(template.join('\n'));
				}
			});
			this.close();
		};
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
