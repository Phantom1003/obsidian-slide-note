import * as pdfjs from "pdfjs-dist";
import {FrontMatterCache, MarkdownPostProcessorContext, Notice} from "obsidian";
import SlideNotePlugin from '../main'

interface PDFBlockParameters {
	file: string;
	page: Array<number>;
	link: boolean;
	scale: number;
	rotat: number;
	rect: Array<number>;
	annot: string;
}

export class PDFBlockProcessor {
	plugin: SlideNotePlugin;
	count: number;

	constructor(plugin: SlideNotePlugin) {
		this.plugin = plugin;
		this.count = 0;
	}

	async CallBack(src: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const frontmatter = app.metadataCache.getCache(ctx.sourcePath)?.frontmatter as FrontMatterCache
		let parameters = null;
		try {
			parameters = await this.parseParameters(src, frontmatter);
		} catch (e) {
			const p = el.createEl("p", {text: "[SlideNote] Invalid Parameters: " + e.message});
			p.style.color = "red"
		}

		// render PDF pages
		if (parameters !== null) {
			try {
				// read PDF
				const arrayBuffer = await app.vault.adapter.readBinary(parameters.file);
				const buffer = Buffer.from(arrayBuffer);
				const document = await pdfjs.getDocument(buffer).promise;

				// page parameter as trigger for whole pdf, 0 = all pages
				if ((<number[]>parameters.page).includes(0)) {
					const pagesArray = [];
					for (let i = 1; i <= document.numPages; i++) {
						pagesArray.push(i);
					}
					parameters.page = pagesArray;
				}

				// Read pages
				for (const pageNumber of <number[]>parameters.page) {
					const page = await document.getPage(pageNumber);
					let host = el;

					// Create hyperlink for Page
					if (parameters.link) {
						const href = el.createEl("a");
						href.href = parameters.file + "#page=" + pageNumber;
						href.className = "internal-link";

						host = href;
					}

					// Get Viewport
					const offsetX = parameters.rect[0] == -1 ?
						0 : Math.floor(parameters.rect[0] * -1 * parameters.scale);
					const offsetY = parameters.rect[1] == -1 ?
						0 : Math.floor(parameters.rect[1] * -1 * parameters.scale);

					// Render Canvas
					const canvas = host.createEl("canvas");
					if (parameters.scale == 1) {
						canvas.style.width = "100%";
					}

					const context = canvas.getContext("2d");

					const baseViewportWidth = page.getViewport({scale: 1.0}).width;
					const baseScale = canvas.clientWidth ? canvas.clientWidth / baseViewportWidth : 1;

					const viewport = page.getViewport({
						scale: baseScale * parameters.scale,
						rotation: parameters.rotat,
						offsetX: offsetX,
						offsetY: offsetY,
					});

					if (parameters.rect[0] == -1) {
						canvas.height = viewport.height;
						canvas.width = viewport.width;
					} else {
						canvas.height = Math.floor(parameters.rect[2] * parameters.scale);
						canvas.width = Math.floor(parameters.rect[3] * parameters.scale);
					}
					const renderContext = {
						canvasContext: context,
						viewport: viewport,
					};
					await page.render(renderContext).promise.then(
						function () {
							if (parameters.annot != "") {
								new Notice("[SlideNote] Page " + pageNumber + " has annotations:\n" + parameters.annot)
								const ctx = context
								eval(parameters.annot)
							}
						}
					)

				}
			} catch (error) {
				const p = el.createEl("p", {text: "[SlideNote] Render Error: " + error});
				p.style.color = "red"
			}
		}
	}

	async parseParameters(src: string, frontmatter: FrontMatterCache) {
		const lines = src.split("\n");
		const keywords = ["file", "page", "link", "scale", "rotat", "rect"];
		const paramsRaw: { [k: string]: string } = {};
		const annot: Array<string> = [];

		for (let i = 0; i < lines.length; i++) {
			const words = lines[i].trim().split(":")
			if (keywords.indexOf(words[0]) > -1) {
				if (words[1].length != 0)
					paramsRaw[words[0]] = words[1].trim();
			}
			else {
				annot.push(lines[i].trim())
			}
		}
		console.log(annot)
		const params: PDFBlockParameters = {
			file: "",
			page: [],
			link: this.plugin.settings.default_link,
			scale: 0,
			rotat: 0,
			rect: [-1, -1, -1, -1],
			annot: annot.join("\n")
		};

		// handle file
		if (paramsRaw["file"] == undefined)
			paramsRaw["file"] = typeof frontmatter["default_file"] == "string" ?
				frontmatter["default_file"] :
				frontmatter["default_file"][0][0];
		const file_raw = paramsRaw["file"].contains("[[") ?
			paramsRaw["file"].replace("[[", "").replace("]]", "") :
			paramsRaw["file"];
		params.file = app.metadataCache.getFirstLinkpathDest(file_raw, "")?.path as string;
		if (params.file == undefined)
			throw new Error(paramsRaw["file"] + ": No such file or directory");

		// handle pages
		if (paramsRaw["page"] == undefined)
			paramsRaw["page"] = "default_page" in frontmatter ? frontmatter["default_page"] : "0";
		const pages = paramsRaw["page"].split(",");
		for (let i = 0; i < pages.length; i++) {
			if (pages[i].contains("-")) {
				const range = pages[i].split("-")
				if (range.length != 2)
					throw new Error(pages[i] + ": Invalid page range")
				params.page = params.page.concat(Array.from({ length: parseInt(range[1]) - parseInt(range[0]) + 1 }, (_, i) => parseInt(range[0]) + i))
			}
			else {
				params.page.push(parseInt(pages[i]))
			}
		}

		// handle link
		if (paramsRaw["link"] == undefined)
			params.link = "default_link" in frontmatter ? frontmatter["default_link"] : this.plugin.settings.default_link
		else
			params.link = paramsRaw["link"].toLowerCase() === 'true'

		// handle scale
		if (paramsRaw["scale"] == undefined)
			params.scale = "default_scale" in frontmatter ? frontmatter["default_scale"] : 1
		else
			params.scale = parseFloat(paramsRaw["scale"])

		// handle rotation
		if (paramsRaw["rotat"] == undefined)
			params.rotat = "default_scale" in frontmatter ? frontmatter["default_scale"] : 0
		else
			params.rotat = parseInt(paramsRaw["rotat"])

		if (paramsRaw["rect"] != undefined)
			params.rect = JSON.parse(paramsRaw["rect"]);

		console.log(params)
		return params;
	}
}




