import * as pdfjs from "pdfjs-dist";

import {MarkdownPreviewView, MarkdownRenderChild} from "obsidian";
import { PDFBlockParameters } from "./processor";
import { SlideNoteSettings } from "../settings";

export class PDFBlockRenderer extends MarkdownRenderChild {
	el: HTMLElement
	params: PDFBlockParameters
	sourcePath: string
	settings: SlideNoteSettings
	public constructor(
		el: HTMLElement,
		params: PDFBlockParameters,
		sourcePath: string,
		settings: SlideNoteSettings

	) {
		super(el);
		this.el = el;
		this.params = params;
		this.sourcePath = sourcePath;
		this.settings = settings;
	}

	onload() {
		this.init();
		this.registerEvent(
			app.vault.on("modify", (file) => {
				if (file.path == this.params.file ) {
					this.render();
				}
			})
		)
	}

	async init() {
		const hook = this.el.createEl("p")
		hook.setText("loading...");
		hook.style.display = "block";
		hook.style.width = "100%";
		hook.style.backgroundColor = "ghostwhite";
		hook.style.height = "300px";

		const pos = hook.getBoundingClientRect().bottom;
		console.log(hook.getBoundingClientRect())
		if (pos != 0) {
			console.log(hook.getBoundingClientRect())
			await this.render();
		}
		else {
			const hook = this.el.createEl("p")
			hook.setText("loading...");
			hook.style.display = "block";
			hook.style.width = "100%";
			hook.style.backgroundColor = "ghostwhite";
			hook.style.height = "300px";
			// const self = this;
			async function inView() {
				if (hook.getBoundingClientRect().bottom != 0) {
					console.log("It's me!", hook.getBoundingClientRect());

					document.removeEventListener("wheel", inView);
					await this.render();
				}
			}
			document.addEventListener("wheel", inView.bind(this));
		}

	}

	async render() {
		this.el.innerHTML = "";
		if (this.params !== null) {
			try {
				const buffer = await app.vault.adapter.readBinary(this.params.file);

				if (!this.checkActiveFile(this.sourcePath))
					return;

				const document = await pdfjs.getDocument(buffer).promise;

				if (!this.checkActiveFile(this.sourcePath))
					return;

				if (this.params.page.includes(0)) {
					this.params.page = Array.from(
						{length: document.numPages},
						(_, i) => i + 1
					);
				}

				for (const pageNumber of this.params.page) {
					if (!this.checkActiveFile(this.sourcePath))
						return;

					const page = await document.getPage(pageNumber);
					let host = this.el.createEl("div");

					if (this.params.link) {
						const href = host.createEl("a");
						href.href = this.params.file + "#page=" + pageNumber;
						href.className = "internal-link";
						host = href;
					}

					const canvas = host.createEl("canvas");
					canvas.style.width = `${Math.floor(this.params.scale * 100)}%`;

					if (!this.checkActiveFile(this.sourcePath))
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

					const effectWidth = this.params.rect[0] == -1 ?
						pageview.width : Math.floor((this.params.rect[2] - this.params.rect[0]) * zoom);

					const effectHeight = this.params.rect[1] == -1 ?
						pageview.height : Math.floor((this.params.rect[3] - this.params.rect[1]) * zoom);
					canvas.width = effectWidth;
					canvas.height = effectHeight;

					const renderContext = {
						canvasContext: context,
						viewport: pageview,
					};

					if (!this.checkActiveFile(this.sourcePath))
						return;

					canvas.addEventListener("mouseup", (event)=> {
						const scale2screenX = zoom * canvas.clientWidth / effectWidth
						const scale2screenY = zoom * canvas.clientHeight / effectHeight
						const baseX = Math.floor(event.offsetX / scale2screenX)
						const baseY = Math.floor(event.offsetY / scale2screenY)
						app.workspace.trigger("slidenote:mouseup",
							event.offsetX, event.offsetY,
							baseX, baseY
						);
					});

					canvas.addEventListener("mousemove", (event)=> {
						const scale2screenX = zoom * canvas.clientWidth / effectWidth
						const scale2screenY = zoom * canvas.clientHeight / effectHeight
						const baseX = Math.floor(event.offsetX / scale2screenX)
						const baseY = Math.floor(event.offsetY / scale2screenY)
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
								try {
									const annots = new Function(
										"ctx", "zoom", "w", "h",
										`
											function H(n) { 
												if (n > 0 && n < 1) return n * zoom * h;
												else return n * zoom;
											}
											function W(n) {
												if (n > 0 && n < 1) return n * zoom * w;
												else return n * zoom;
											}
											ctx.font=\`\${25 * zoom}px Arial\`
											${this.params.annot}
										`
									);
									annots(context, zoom, effectWidth / zoom, effectHeight / zoom);
								} catch (error) {
									throw new Error(`Annotation Failed: ${error}`);
								}

							}
						}
					)

				}
				MarkdownPreviewView.renderMarkdown(this.params.note, this.el, this.sourcePath, this);
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
