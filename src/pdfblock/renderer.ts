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

	onload() {
		this.render();
		this.registerEvent(
			app.vault.on("modify", (file) => {
				if (file.path == this.params.file ) {
					this.render();
				}
			})
		)
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

					// Render Canvas
					const canvas = host.createEl("canvas");
					if (canvas.clientWidth == 0)
						throw new Error("Canvas Error: client has zero width")
					canvas.style.width = `${Math.floor(this.params.scale * 100)}%`;

					if (!this.checkActiveFile(this.note))
						return;

					const context = canvas.getContext("2d");
					const zoom = 2
					const offsetX = this.params.rect[0] == -1 ? 0 : - this.params.rect[0];
					const offsetY = this.params.rect[1] == -1 ? 0 : - this.params.rect[1];
					const pageview = page.getViewport({
						scale: zoom,
						rotation: this.params.rotat,
						offsetX: offsetX * zoom,
						offsetY: offsetY * zoom,
					});

					if (this.params.rect[0] == -1) {
						canvas.height = pageview.height;
						canvas.width = pageview.width;
					} else {
						canvas.width = Math.floor((this.params.rect[2] - this.params.rect[0]) * zoom);
						canvas.height = Math.floor((this.params.rect[3] - this.params.rect[1]) * zoom);
					}
					const renderContext = {
						canvasContext: context,
						viewport: pageview,
					};

					if (!this.checkActiveFile(this.note))
						return;

					canvas.addEventListener("mousemove", (event)=> {
						const scaleX = this.params.scale * canvas.clientWidth * zoom / pageview.width
						const scaleY = this.params.scale * canvas.clientHeight * zoom / pageview.height
						const baseX = Math.floor(event.offsetX / scaleX)
						const baseY = Math.floor(event.offsetY / scaleY)
						app.workspace.trigger("slidenote:mousemove",
							event.offsetX, event.offsetY,
							baseX, baseY
						);
					});

					canvas.addEventListener("mouseleave", (event)=> {
						app.workspace.trigger("slidenote:mouseleave");
					});

					await page.render(renderContext).promise.then(
						() => {
							if (this.params.annot != "" && this.settings.allow_annotations) {
								// new Notice("[SlideNote] Page " + pageNumber + " has annotations:\n" + parameters.annot)
								const scaleX = this.params.scale * canvas.clientWidth * zoom / pageview.width
								const scaleY = this.params.scale * canvas.clientHeight * zoom / pageview.height
								try {
									const annots = new Function(
										"ctx", "scaleX", "scaleY", "h", "w",
										`	// prologue
											function H(n) { 
												if (n > 0 && n < 1) return n * h * scaleY;
												else return n * scaleY;
											}
											function W(n) {
												if (n > 0 && n < 1) return n * w * scaleX;
												else return n * scaleX;
											}
											ctx.font=\`\${50 * scaleX}px Arial\`
											// user input
											${this.params.annot}
										`
									);
									annots(context, scaleX, scaleY, pageview.height, pageview.width);
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

}
