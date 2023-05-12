import * as pdfjs from "pdfjs-dist";
import { FrontMatterCache, MarkdownPostProcessorContext } from "obsidian";
import SlideNotePlugin from '../main';
import { PDFBlockRenderer } from "./renderer";
import { FileCache } from "./cache";

export interface PDFBlockParameters {
	file: string;
	page: Array<number>;
	text: boolean;
	scale: number;
	dpi: number;
	rotat: number;
	rect: Array<number>;
	annot: string;
	note: string;
}

export class PDFBlockProcessor {
	plugin: SlideNotePlugin;
	cache: FileCache

	constructor(plugin: SlideNotePlugin, cache: FileCache) {
		this.plugin = plugin;
		this.cache = cache;
	}

	async codeProcessCallBack(src: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const frontmatter = app.metadataCache.getCache(ctx.sourcePath)?.frontmatter as FrontMatterCache
		let params = null;
		try {
			params = await this.parseParameters(src, frontmatter);
			const render = new PDFBlockRenderer(el, params, ctx.sourcePath, this.plugin.settings, this.cache);
			render.load();
			ctx.addChild(render);
		} catch (e) {
			const p = el.createEl("p", {text: "[SlideNote] Invalid Parameters: " + e.message});
			p.style.color = "red";
		}
	}

	async parseParameters(src: string, frontmatter: FrontMatterCache) {
		const lines = src.split("\n");
		const keywords = ["file", "page", "text", "scale", "rotat", "rect", "dpi"];
		const paramsRaw: { [k: string]: string } = {};
		const annot: Array<string> = [];
		const note: Array<string> = [];

		for (let i = 0; i < lines.length; i++) {
			const words = lines[i].trim().split(":")
			if (keywords.indexOf(words[0]) > -1) {
				if (words[1].length != 0)
					paramsRaw[words[0]] = words[1].trim();
			}
			else {
				if (lines[i].trim().startsWith("@"))
					annot.push(lines[i].trim().slice(1));
				else
					note.push(lines[i]);
			}
		}

		const params: PDFBlockParameters = {
			file: "",
			page: [],
			text: this.plugin.settings.default_text,
			scale: 1,
			dpi: this.plugin.settings.default_dpi,
			rotat: 0,
			rect: [-1, -1, -1, -1],
			annot: annot.join("\n"),
			note: note.join("\n")
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
			paramsRaw["page"] = frontmatter && "default_page" in frontmatter ? frontmatter["default_page"] : "0";
		const pages = paramsRaw["page"].split(",");
		for (let i = 0; i < pages.length; i++) {
			if (pages[i].contains("-")) {
				const range = pages[i].split("-");
				if (range.length != 2)
					throw new Error(pages[i] + ": Invalid page range");
				params.page = params.page.concat(Array.from({ length: parseInt(range[1]) - parseInt(range[0]) + 1 }, (_, i) => parseInt(range[0]) + i));
			}
			else {
				params.page.push(parseInt(pages[i]));
			}
		}

		// handle text layer
		if (paramsRaw["text"] == undefined) {
			if (frontmatter && "default_text" in frontmatter)
				params.text = frontmatter["default_text"];
		}
		else {
			params.text = paramsRaw["text"].toLowerCase() === 'true';
		}

		// handle scale
		if (paramsRaw["scale"] == undefined) {
			if (frontmatter && "default_scale" in frontmatter)
				params.scale = frontmatter["default_scale"];
		}
		else {
			params.scale = parseFloat(paramsRaw["scale"]);
		}

		// handle dpi
		if (paramsRaw["dpi"] == undefined) {
			if (frontmatter && "default_dpi" in frontmatter)
				params.dpi = frontmatter["default_dpi"];
		}
		else {
			params.dpi = parseInt(paramsRaw["dpi"]);
		}

		// handle rotation
		if (paramsRaw["rotat"] == undefined) {
			if (frontmatter && "default_rotat" in frontmatter) {
				params.rotat = frontmatter["default_rotat"];
			}
		}
		else {
			params.rotat = parseInt(paramsRaw["rotat"]);
		}


		if (paramsRaw["rect"] != undefined) {
			const rect = paramsRaw["rect"].split(",");
			const new_rect = [];
			new_rect.push(parseFloat(rect[0].trim().slice(2,-1)));
			new_rect.push(parseFloat(rect[1].trim().slice(2,-1)));
			new_rect.push(parseFloat(rect[2].trim().slice(2,-1)));
			new_rect.push(parseFloat(rect[3].trim().slice(2,-1)));
			params.rect = new_rect;
		}

		// console.log(params)
		return params;
	}
}




