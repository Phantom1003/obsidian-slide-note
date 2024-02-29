import {Editor, MarkdownView, Menu, Platform, Plugin} from 'obsidian';

import { FileCache } from "./pdfblock/cache";
import { PDFBlockProcessor, ParameterSyntaxType } from "./pdfblock/processor";
import { PDFCANVAS_VIEW, PDFCanvasView } from "./pdfview/canvas";
import { SlideNoteCMDModal } from "./pdfcmd/generator";
import { SlideNoteSettings, SlideNoteSettingsTab } from './settings';
import { openPDFwithLocal } from "./pdfcmd/open";
import {getFileName} from "./pdfcmd/utils";

export default class SlideNotePlugin extends Plugin {
	settings: SlideNoteSettings;

	async onload() {
		console.log("SlideNote loading ...");

		await this.loadSettings();
		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));

		this.registerPDFProcessor();
		this.registerPDFCanvas();
		this.registerPDFMenu();

		if (this.settings.support_better_pdf)
			this.registerBetterPdfProcessor();

		this.addRibbonIcon('star-list', 'Slide Note Block Generator', (evt: MouseEvent) => {
			new SlideNoteCMDModal(this.app).open();
		});
		this.addCommand({
			id: 'generate-slide-note-block',
			name: 'Generate Slide Note Code Block',
			callback: () => {
				new SlideNoteCMDModal(this.app).open();
				// this.app.commands.executeCommandById
			}
		});
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
		// @ts-ignore
		this.registerEvent(this.app.workspace.on("slidenote:dblclick", (canvas) => {
			this.activeCanvas(canvas.toDataURL());
		}));

		this.registerView(
			PDFCANVAS_VIEW,
			(leaf) => new PDFCanvasView(leaf)
		);
	}

	registerPDFMenu() {
		// @ts-ignore
		this.registerEvent(this.app.workspace.on("slidenote:rclick", (event, block: HTMLElement) => {
			const menu = new Menu();
			menu.addItem((item) => {
				item.setTitle("Edit")
					.setIcon("pencil")
					.onClick((_) => {
						// @ts-ignore
						block.nextSibling?.click();
					})
			})
			if (Platform.isDesktop) {
				menu.addItem((item) => {
					item.setTitle("Open PDF with local APP")
						.setIcon("book-open")
						.onClick((_) => {
							// @ts-ignore
							openPDFwithLocal(this.app.workspace.getActiveViewOfType(MarkdownView));
						});
				});
			}
			menu.showAtMouseEvent(event);
		}));

		this.registerEvent(this.app.workspace.on('editor-menu',
			(menu: Menu, _: Editor, view: MarkdownView) => {
				if (Platform.isDesktop && getFileName(view) != undefined) {
					menu.addItem((item) => {
						item.setTitle("Slide Note: Open PDF with local APP")
							.setIcon("book-open")
							.onClick((_) => {
								openPDFwithLocal(view);
							});
					});
				}
			}));
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

		await this.app.workspace.getRightLeaf(false)?.setViewState({
			type: PDFCANVAS_VIEW,
			active: true,
		});
		const canvas = this.app.workspace.getLeavesOfType(PDFCANVAS_VIEW)[0];

		app.workspace.trigger("slidenote:newcanvas", src);
		this.app.workspace.revealLeaf(canvas);
	}
}
