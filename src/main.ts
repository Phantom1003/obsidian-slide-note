import { Plugin } from 'obsidian';
import { SlideNoteSettings, SlideNoteSettingsTab } from './settings';
import { PDFBlockProcessor } from "./pdfblock/processor";
import { FileCache } from "./pdfblock/cache";
import { PDFCANVAS_VIEW, PDFCanvasView } from "./pdfview/canvas";


export default class SlideNotePlugin extends Plugin {
	settings: SlideNoteSettings;

	async onload() {
		console.log("SlideNote loading ...");

		await this.loadSettings();
		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));

		this.registerPDFProcessor();

		this.registerPDFCanvas();
	}

	registerPDFProcessor() {
		const cache = new FileCache(3);
		const processor = new PDFBlockProcessor(this, cache);
		const handler = this.registerMarkdownCodeBlockProcessor(
			"slide-note",
			async (src, el, ctx) =>
				processor.codeProcessCallBack(src, el, ctx)
		);
		handler.sortOrder = -100;
	}

	registerPDFCanvas() {
		this.registerEvent(this.app.workspace.on("slidenote:dblclick", (canvas) => {
			this.activeCanvas(canvas.toDataURL());
		}));

		this.registerView(
			PDFCANVAS_VIEW,
			(leaf) => new PDFCanvasView(leaf)
		);
	}

	onunload() {
		console.log("SlideNote unloading ...");
		this.app.workspace.detachLeavesOfType(PDFCANVAS_VIEW);
	}

	async loadSettings() {
		this.settings = Object.assign({}, new SlideNoteSettings(), await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activeCanvas(src: string) {
		this.app.workspace.detachLeavesOfType(PDFCANVAS_VIEW);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: PDFCANVAS_VIEW,
			active: true,
		});
		const canvas = this.app.workspace.getLeavesOfType(PDFCANVAS_VIEW)[0];

		app.workspace.trigger("slidenote:newcanvas", src);
		this.app.workspace.revealLeaf(canvas);
	}
}
