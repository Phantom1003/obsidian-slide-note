import { Editor, MarkdownView, Menu, Platform, Plugin } from 'obsidian';

import { FileCache } from "./pdfblock/cache";
import { PDFBlockProcessor, ParameterSyntaxType } from "./pdfblock/processor";
import { PDFCANVAS_VIEW, PDFCanvasView } from "./pdfview/canvas";
import { SlideNoteCMDModal } from "./pdfcmd/generateor";
import { SlideNoteSettings, SlideNoteSettingsTab } from './settings';
import { openPDFwithLocal } from "./pdfcmd/open";

export default class SlideNotePlugin extends Plugin {
	settings: SlideNoteSettings;

	async onload() {
		console.log("SlideNote loading ...");

		await this.loadSettings();
		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));

		this.registerPDFProcessor();

		if (this.settings.support_better_pdf)
			this.registerBetterPdfProcessor();

		this.registerPDFCanvas();

		this.addRibbonIcon('star-list', 'Slide Note Block Generator', (evt: MouseEvent) => {
			new SlideNoteCMDModal(this.app).open();
		});
		this.addCommand({
			id: 'generate-slide-note-block',
			name: 'Generate Slide Note Code Block',
			callback: () => {
				new SlideNoteCMDModal(this.app).open();
			}
		});

		this.registerEvent(this.app.workspace.on('editor-menu',
			(menu: Menu, _: Editor, view: MarkdownView) => {
				if (Platform.isDesktop) {
					menu.addItem((item) => {
						item.setTitle("Slide Note: open with local application")
							.setIcon("book-open")
							.onClick((_) => {
								openPDFwithLocal(view);
							});
					});
				}
			}));
	}

	registerPDFProcessor() {
		const cache = new FileCache(3);
		const processor = new PDFBlockProcessor(this, cache, ParameterSyntaxType.SlideNote);
		const handler = this.registerMarkdownCodeBlockProcessor(
			"slide-note",
			async (src, el, ctx) =>
				processor.codeProcessCallBack(src, el, ctx)
		);
		handler.sortOrder = -100;
	}

	registerBetterPdfProcessor() {
		const cache = new FileCache(3);
		const processor = new PDFBlockProcessor(this, cache, ParameterSyntaxType.BetterPDF);
		const handler = this.registerMarkdownCodeBlockProcessor(
			"pdf",
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
		if(this.settings.support_better_pdf)
			this.registerBetterPdfProcessor();
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
