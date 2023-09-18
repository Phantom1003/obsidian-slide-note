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

export enum ParameterSyntaxType {
	SlideNote = 'SlideNote',
	BetterPDF = 'BetterPDF'
}

export class PDFBlockProcessor {

	constructor(private plugin: SlideNotePlugin, 
		private cache: FileCache, 
		private parameterSyntax:ParameterSyntaxType
	) {
	}

	async codeProcessCallBack(src: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const frontmatter = app.metadataCache.getCache(ctx.sourcePath)?.frontmatter as FrontMatterCache
		try {
			let params: PDFBlockParameters;
			if (this.parameterSyntax == ParameterSyntaxType.SlideNote)
				params = await this.parseParameters(src, frontmatter);
			else if (this.parameterSyntax == ParameterSyntaxType.BetterPDF)
				params = await this.parseBetterPdfParameters(src, frontmatter);
			else
				throw new Error("Invalid Parameter Syntax Type");
			const render = new PDFBlockRenderer(el, params, ctx.sourcePath, this.plugin.settings, this.cache);
			render.load();
			ctx.addChild(render);
		} catch (e) {
			const p = el.createEl("p", {text: "[SlideNote] Invalid Parameters: " + e.message});
			p.style.color = "red";
		}
	}

	async parseParameters(src: string, frontmatter: FrontMatterCache): Promise<PDFBlockParameters> {
		const lines = src.split("\n");
		const keywords = ["file", "page", "text", "scale", "rotat", "rect", "dpi"];
		const paramsRaw: { [k: string]: string } = {};
		const annot: Array<string> = [];
		const note: Array<string> = [];

		for (let i = 0; i < lines.length; i++) {
			const words = lines[i].trim().split(/:(.*)/s)
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
		params.file = app.metadataCache.getFirstLinkpathDest(file_raw, "")?.path ?? file_raw;
		if (params.file == undefined)
			throw new Error(paramsRaw["file"] + ": No such file or directory");

		// handle pages
		if (paramsRaw["page"] == undefined)
			paramsRaw["page"] = "0";
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

		// handle rect
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

	async parseBetterPdfParameters(src: string, frontmatter: FrontMatterCache): Promise<PDFBlockParameters> {
		// [[filename.pdf]] isn't valid json, add quotes to fix it
		let left_brackets = /("url":.*\]\])(?!")/g
		let right_brackets = /("url":[^",]*)(\[\[)/g

		src = src.replace(left_brackets, "$1\"")
		src = src.replace(right_brackets, "$1\"$2")

		const config = JSON.parse(src);
		const params: PDFBlockParameters = {
			file: "",
			page: [],
			text: this.plugin.settings.default_text,
			scale: 1,
			dpi: this.plugin.settings.default_dpi,
			rotat: 0,
			rect: [-1, -1, -1, -1],
			annot: "",
			note: ""
		};

		// handle pages
		if(config["url"] != undefined) {
			params.file = config["url"];
			let url_regex  = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/
			// if it is url, error as urls are not supported
			if (params.file.match(url_regex))
				throw new Error(params.file + ": Urls are not supported");
			
			params.file = params.file.replace("[[", "").replace("]]", "");
			params.file = app.metadataCache.getFirstLinkpathDest(params.file, "")?.path as string;
			if (params.file == undefined)
				throw new Error(params.file + ": No such file or directory");
		}

		// handle pages
		if(config["page"]){
			if (typeof config["page"] === "number")
				params.page = [config["page"]];
			else if (Array.isArray(config["page"]))
			{
				for (let i = 0; i < config["page"].length; i++) {
					if (typeof config["page"][i] === "number")
						params.page.push(config["page"][i]);
					else if (Array.isArray(config["page"][i]))
					{
						if (config["page"][i].length != 2)
							throw new Error(config["page"][i] + ": Invalid page range");
						let start = config["page"][i][0];
						let end = config["page"][i][1];
						params.page = params.page.concat(Array.from({ length: end - start + 1 }, (_, i) => start + i));
					}
				}
			}
		}

		// handle range
		if(config["range"]){
			if (config["range"].length != 2)
				throw new Error(config["range"] + ": Invalid page range");
			let start = config["range"][0];
			let end = config["range"][1];
			params.page = Array.from({ length: end - start + 1 }, (_, i) => start + i);
		}

		// handle scale
		if(config["scale"] != undefined)
			params.scale = config["scale"];
		else if (frontmatter && "default_scale" in frontmatter)
				params.scale = frontmatter["default_scale"];
		
		
		// handle rotation
		if(config["rotation"] != undefined)
			params.rotat = config["rotation"];
		else if (frontmatter && "default_rotat" in frontmatter)
				params.rotat = frontmatter["default_rotat"];
		
		// handle rect
		if(config["rect"] != undefined && config["rect"].length == 4)
			params.rect = [...config["rect"]];

		return params;
	}
}




