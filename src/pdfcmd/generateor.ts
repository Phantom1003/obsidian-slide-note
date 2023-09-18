import { App, Modal, Notice, MarkdownView } from 'obsidian';

export class SlideNoteCMDModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const container = this.contentEl.createEl("div");
		container.createEl('h2', {text: "SlideNote Block Generator"});
		container.createEl('p', {text: `Current Active File: ${this.app.workspace.getActiveFile()?.path}`});
		let target = this.app.metadataCache.getFileCache(this.app.workspace.getActiveFile())?.frontmatter?.default_file;
		if (target == undefined) {
			container.createEl('p', {
				text: "Please specify a `default_file` in the frontmatter",
				attr: {style: "color: red;"}
			});
			return;
		}
		container.style.maxHeight = '1000px';
		target = this.app.metadataCache.getFirstLinkpathDest(target, "")?.path as string;
		container.createEl('p', {text: `Target File: ${target}`});
		target = this.app.vault.adapter.getResourcePath(target);
		const iframe = container.createEl('iframe');
		iframe.src = target;
		iframe.style.width = '100%';
		iframe.style.height = '500px';

		const generate = container.createEl('div');
		generate.style.textAlign = "center";
		const input = generate.createEl("input", {attr: {style: "margin-right: 8px;"}})
		input.placeholder = "enter page range"
		generate.createEl('button', {text: "Generate"}).onclick = (e) => {
			let pages = []
			const ranges = input.value.split(",");
			ranges.forEach((r, i) => {
				if (r.contains("-")) {
					const range = r.split("-");
					if (range.length != 2)
						throw new Notice(r + ": Invalid page range");
					pages = pages.concat(Array.from({ length: parseInt(range[1]) - parseInt(range[0]) + 1 }, (_, i) => parseInt(range[0]) + i));
				}
				else {
					pages.push(parseInt(r));
				}
			});
			pages.reverse().forEach((p, i) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const template = [
						"```slide-note",
						`page: ${p}`,
						"```",
						`^page${p}`,
						"",
						"",
						"---",
						"\n"
					];
					const cursor = view.editor.getCursor();
					view.editor.replaceRange(template.join('\n'), cursor);
				}
			});
		};
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
