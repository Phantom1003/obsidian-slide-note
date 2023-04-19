import * as pdfjs from "pdfjs-dist";

import { MarkdownRenderChild } from "obsidian";
import { PDFBlockParameters } from "./processor";
import { SlideNoteSettings } from "../settings";

export class PDFBlockRenderer extends MarkdownRenderChild {
	el: HTMLElement
	params: PDFBlockParameters
	note: string
	settings: SlideNoteSettings
	public constructor(
		el: HTMLElement,
		params: PDFBlockParameters,
		note: string,
		settings: SlideNoteSettings

	) {
		super(el);
		this.el = el;
		this.params = params;
		this.note = note;
		this.settings = settings;
	}

	async render() {
		this.el.innerHTML = "";
		// render PDF pages
		if (this.params !== null) {
			try {
				// read PDF
				const arrayBuffer = await app.vault.adapter.readBinary(this.params.file);
				const buffer = Buffer.from(arrayBuffer);

				if (!this.checkActiveFile(this.note))
					return;

				const document = await pdfjs.getDocument(buffer).promise;

				if (!this.checkActiveFile(this.note))
					return;

				// page parameter as trigger for whole pdf, 0 = all pages
				if ((<number[]>this.params.page).includes(0)) {
					const pagesArray = [];
					for (let i = 1; i <= document.numPages; i++) {
						pagesArray.push(i);
					}
					this.params.page = pagesArray;
				}

				// Read pages
				for (const pageNumber of <number[]>this.params.page) {
					if (!this.checkActiveFile(this.note))
						return;

					const page = await document.getPage(pageNumber);
					let host = this.el;

					// Create hyperlink for Page
					if (this.params.link) {
						const href = this.el.createEl("a");
						href.href = this.params.file + "#page=" + pageNumber;
						href.className = "internal-link";

						host = href;
					}

					// Get Viewport
					const offsetX = this.params.rect[0] == -1 ?
						0 : Math.floor(this.params.rect[0] * -1 * this.params.scale);
					const offsetY = this.params.rect[1] == -1 ?
						0 : Math.floor(this.params.rect[1] * -1 * this.params.scale);

					// Render Canvas
					const canvas = host.createEl("canvas");
					if (this.params.scale == 1) {
						canvas.style.width = "100%";
					}

					if (!this.checkActiveFile(this.note))
						return;

					const context = canvas.getContext("2d");

					const baseView = page.getViewport({scale: 1.0});
					const baseScale = canvas.clientWidth ? canvas.clientWidth / baseView.width : 1;

					const viewport = page.getViewport({
						scale: baseScale * this.params.scale,
						rotation: this.params.rotat,
						offsetX: offsetX,
						offsetY: offsetY,
					});

					if (this.params.rect[0] == -1) {
						canvas.height = viewport.height;
						canvas.width = viewport.width;
					} else {
						canvas.height = Math.floor(this.params.rect[2] * this.params.scale);
						canvas.width = Math.floor(this.params.rect[3] * this.params.scale);
					}
					const renderContext = {
						canvasContext: context,
						viewport: viewport,
					};

					if (!this.checkActiveFile(this.note))
						return;

					await page.render(renderContext).promise.then(
						() => {
							if (this.params.annot != "" && this.settings.allow_annotations) {
								// new Notice("[SlideNote] Page " + pageNumber + " has annotations:\n" + parameters.annot)
								try {
									const annots = new Function(
										"ctx", "scale", "h", "w",
										`	// prologue
											function H(n) { 
												if (n > 0 && n < 1) return n * h * scale;
												else return n * scale;
											}
											function W(n) {
												if (n > 0 && n < 1) return n * w * scale;
												else return n * scale;
											}
											ctx.font=\`\${20 * scale}px Arial\`
											// user input
											${this.params.annot}
										`
									);
									annots(context, baseScale * this.params.scale, baseView.height, baseView.width);
								} catch (error) {
									throw new Error(`Annotation Failed: ${error}`);
								}

							}
						}
					)

				}
			} catch (error) {
				const p = this.el.createEl("p", {text: "[SlideNote] Render Error: " + error});
				p.style.color = "red";
			}
		}
	}

	checkActiveFile(ctx_file: string) {
		const cur_file = app.workspace.getActiveFile()?.path;
		if (cur_file == undefined)
			return true;
		else if (ctx_file != cur_file)
			return false;
		else
			return true;
	}

	onload() {
		this.render();
		this.registerEvent(
			app.vault.on("modify", (file) => {
				if (file.extension == "pdf" ) {
					console.log("Here")
					this.render();
				}
			})
		)
	}
}
