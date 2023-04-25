import * as pdfjs from "pdfjs-dist";
import { FrontMatterCache, MarkdownPostProcessorContext } from "obsidian";
import SlideNotePlugin from '../main';
import { PDFBlockRenderer } from "./renderer";
import { FileCache } from "./cache";

export interface PDFBlockParameters {
	file: string;
	page: Array<number>;
	link: boolean;
	scale: number;
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
		const keywords = ["file", "page", "link", "scale", "rotat", "rect"];
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
			link: this.plugin.settings.default_link,
			scale: 0,
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

		// handle link
		if (paramsRaw["link"] == undefined)
			params.link = frontmatter && "default_link" in frontmatter ? frontmatter["default_link"] : this.plugin.settings.default_link;
		else
			params.link = paramsRaw["link"].toLowerCase() === 'true';

		// handle scale
		if (paramsRaw["scale"] == undefined)
			params.scale = frontmatter && "default_scale" in frontmatter ? frontmatter["default_scale"] : 1;
		else
			params.scale = parseFloat(paramsRaw["scale"]);

		// handle rotation
		if (paramsRaw["rotat"] == undefined)
			params.rotat = frontmatter && "default_scale" in frontmatter ? frontmatter["default_scale"] : 0;
		else
			params.rotat = parseInt(paramsRaw["rotat"]);

		if (paramsRaw["rect"] != undefined)
			params.rect = JSON.parse(paramsRaw["rect"]);

		// console.log(params)
		return params;
	}
}




