import { MarkdownPreviewView, MarkdownRenderChild, loadPdfJs } from "obsidian";
import { PDFBlockParameters } from "./processor";
import { SlideNoteSettings } from "../settings";
import { FileCache } from "./cache";

export class PDFBlockRenderer extends MarkdownRenderChild {
	el: HTMLElement
	params: PDFBlockParameters
	sourcePath: string
	settings: SlideNoteSettings
	cache: FileCache
	public constructor(
		el: HTMLElement,
		params: PDFBlockParameters,
		sourcePath: string,
		settings: SlideNoteSettings,
		cache: FileCache
	) {
		super(el);
		this.el = el;
		this.params = params;
		this.sourcePath = sourcePath;
		this.settings = settings;
		this.cache = cache;
	}

	onload() {
		this.init();
		this.registerEvent(
			app.vault.on("modify", (file) => {
				if (file.path == this.params.file ) {
					this.cache.invalid(file.path);
					this.render();
				}
			})
		)
	}

	async init() {
		const hook = this.el.createEl("div");
		hook.addClass("slide-note-loading-hook");
		const loader = hook.createEl("div");
		loader.addClass("loader");

		const pos = hook.getBoundingClientRect().bottom;

		if (pos != 0 && pos <= window.innerHeight) {
			this.render();
		}
		else {
			const delay = window.setInterval(
				() => {
					clearInterval(delay);
					this.render();
				},
				(this.params.page[0] % 15 + 1) * 5000
			)

			function renderCallBcak() {
				if (hook.getBoundingClientRect().bottom != 0) {
					clearInterval(delay);
					this.render();
				}
			}
			document.addEventListener("wheel", renderCallBcak.bind(this));
			document.addEventListener("touchmove",  renderCallBcak.bind(this));
		}
	}

	async render() {
		this.el.innerHTML = "";
		if (this.params !== null) {
			try {
				const buffer = await this.cache.get(this.params.file);
				const pdfjs = await loadPdfJs();
				const pdfdocument = await pdfjs.getDocument(buffer).promise;

				if (this.params.page.includes(0)) {
					this.params.page = Array.from(
						{length: pdfdocument.numPages},
						(_, i) => i + 1
					);
				}

				for (const pageNumber of this.params.page) {

					const page = await pdfdocument.getPage(pageNumber);
					const host = this.el.createEl("div");
					host.addClass("slide-note-pdfblock");
					host.style.position = "relative";

					const canvas = host.createEl("canvas");
					canvas.addClass("slide-note-canvas-layer");
					canvas.style.width = `${Math.floor(this.params.scale * 100)}%`;
					canvas.style.direction = "ltr";
					const context = canvas.getContext("2d");
					const zoom = this.params.dpi;
					const offsetX = this.params.rect[0] == -1 ? 0 : - this.params.rect[0] * page.view[2] * zoom;
					const offsetY = this.params.rect[1] == -1 ? 0 : - this.params.rect[1] * page.view[3] * zoom;
					const pageview = page.getViewport({
						scale: zoom,
						rotation: this.params.rotat,
						offsetX: offsetX,
						offsetY: offsetY,
					});

					const effectWidth = this.params.rect[0] == -1 ?
						pageview.width : Math.floor(this.params.rect[2] * page.view[2] * zoom);

					const effectHeight = this.params.rect[1] == -1 ?
						pageview.height : Math.floor(this.params.rect[3] * page.view[3] * zoom);
					canvas.width = effectWidth;
					canvas.height = effectHeight;

					const renderContext = {
						canvasContext: context,
						viewport: pageview,
					};

					canvas.addEventListener("dblclick", (event)=> {
						app.workspace.trigger("slidenote:dblclick", canvas);
					});

					await page.render(renderContext).promise
						.then(
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
					);

					if (this.params.text && (this.params.rect[0] == -1) && (this.params.rotat == 0)) {
						await page.getTextContent()
							.then((textContent) => {
								function resize2Canvas() {
									text.style.setProperty('--scale-factor', (canvas.clientWidth/effectWidth*zoom).toString());
								}

								const text = host.createEl("div");
								text.addClass("slide-note-text-layer");
								text.style.setProperty('--scale-factor', zoom.toString());
								text.addEventListener("dblclick", (event)=> {
									app.workspace.trigger("slidenote:dblclick", text.previousElementSibling);
								});
								
								pdfjs.renderTextLayer({
									textContentSource: textContent,
									container: text,
									viewport: pageview
								});

								new ResizeObserver(resize2Canvas).observe(canvas)
							});
					}
				}
				MarkdownPreviewView.renderMarkdown(this.params.note, this.el, this.sourcePath, this);
			} catch (error) {
				const p = this.el.createEl("p", {text: "[SlideNote] Render Error: " + error});
				p.style.color = "red";
			}
		}
	}
}
