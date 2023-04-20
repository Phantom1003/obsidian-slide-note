import * as pdfjs from "pdfjs-dist";
import * as worker from "pdfjs-dist/build/pdf.worker.entry.js";

import { MarkdownView, Notice, Plugin } from 'obsidian';
import { SlideNoteSettings, SlideNoteSettingsTab } from './settings';
import { PDFBlockProcessor } from "./pdfblock/processor";

export default class SlideNotePlugin extends Plugin {
	settings: SlideNoteSettings;

	async onload() {
		console.log("SlideNote loading ...");

		await this.loadSettings();
		pdfjs.GlobalWorkerOptions.workerSrc = worker;

		this.registerPDFProcessor();
		this.registerCursorPosition();

		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));
	}

	registerPDFProcessor() {
		let processor = new PDFBlockProcessor(this);
		let handler = this.registerMarkdownCodeBlockProcessor(
			"slide",
			async (src, el, ctx) =>
				processor.codeProcessCallBack(src, el, ctx)
		);
		handler.sortOrder = -100;
	}

	registerCursorPosition() {

		const cursorPos = this.addStatusBarItem();
		this.registerEvent(this.app.workspace.on("slidenote:mousemove", (x, y, xp, yp) => {
			cursorPos.setText(`[${x},${y}] [${xp},${yp}]`)
		}));
		this.registerEvent(this.app.workspace.on("slidenote:mouseleave", () => {
			cursorPos.setText("")
		}));
	}

	onunload() {
		console.log("SlideNote unloading ...");
	}

	async loadSettings() {
		this.settings = Object.assign({}, new SlideNoteSettings(), await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
