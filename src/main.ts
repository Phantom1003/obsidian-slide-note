import * as pdfjs from "pdfjs-dist";
import * as worker from "pdfjs-dist/build/pdf.worker.entry.js";

import { MarkdownView, Notice, Plugin } from 'obsidian';
import { SlideNoteSettings, SlideNoteSettingsTab } from './settings';
import { PDFBlockProcessor } from "./pdfblock/processor";

export default class SlideNotePlugin extends Plugin {
	settings: SlideNoteSettings;

	async onload() {
		console.log("Better Slides loading...");

		await this.loadSettings();
		pdfjs.GlobalWorkerOptions.workerSrc = worker;

		this.registerFuctions();
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		this.registerEvent(
			app.vault.on("modify", () => {
				console.log("Something modify!");
			})
		)


		/* Unuseful code begin */
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SlideNoteSettingsTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		/* Unuseful code end */

	}

	registerFuctions() {
		let processor = new PDFBlockProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			"pdf",
			async (src, el, ctx) =>
				processor.CallBack(src, el, ctx)
		);
	}

	onunload() {
		console.log("Better Slides unloading...");
	}

	async loadSettings() {
		this.settings = Object.assign({}, new SlideNoteSettings(), await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
