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

		this.registerPlugin();
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));
	}

	registerPlugin() {
		let processor = new PDFBlockProcessor(this);
		let handler = this.registerMarkdownCodeBlockProcessor(
			"slide",
			async (src, el, ctx) =>
				processor.codeProcessCallBack(src, el, ctx)
		);
		handler.sortOrder = -100;
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
