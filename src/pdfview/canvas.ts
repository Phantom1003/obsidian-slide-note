import { ItemView, WorkspaceLeaf } from "obsidian";

import { fabric } from "fabric";

export const PDFCANVAS_VIEW = "slidenote-pdfcanvas";

export class PDFCanvasView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return PDFCANVAS_VIEW;
	}

	getDisplayText() {
		return "PDF Canvas";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		const content = container.createEl("div")
		content.style.position = "relative"
		content.createEl("h1").setText("SlideNote PDF Canvas")

		const preview = content.createEl("div")
		const option = container.createEl("div")
		const save = container.createEl("div")

		preview.createEl("h4").setText("Preview:")
		const image = preview.createEl("img")
		image.style.position = "absolute";
		image.style.width = "95%";
		const canvas = preview.createEl("canvas")
		canvas.style.position = "absolute";
		const drawboard = new fabric.Canvas(canvas, {
			isDrawingMode: false,
		});
		drawboard.setHeight(image.innerHeight);
		drawboard.setWidth(image.innerWidth);
		drawboard.renderAll();

		drawboard.freeDrawingBrush.color = "rgba(250,230,50,0.5)";
		drawboard.freeDrawingBrush.width = 10;

		save.createEl("h4").setText("Copy following annotations to your note:")
		const output = save.createEl("textarea", {attr: {style: "width: 100%"}})
		output.setText("Click Save button first ...")
		output.style.minHeight = "100px"


		option.createEl("h4").setText("Options:")
		option.createEl("button", {text: "Select", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			drawboard.isDrawingMode = false;
		});
		option.createEl("button", {text: "Pen", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			drawboard.isDrawingMode = true;
		});
		option.createEl("button", {text: "Delete", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			if(drawboard.getActiveObject()){
				drawboard.remove(drawboard.getActiveObject());
			}
		});
		option.createEl("button", {text: "Text", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			const textbox = new fabric.Textbox("add your text here",{
				width : 400,
				fontSize: 30,
				fontFamily: "Arial"
			});
			textbox.setControlsVisibility({
				mt: false,
				mb: false,
				mtr: false
			});
			drawboard.add(textbox);
			drawboard.setActiveObject(textbox);
		});
		option.createEl("button", {text: "Line", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			const line = new fabric.Line([50, 50, 150, 50], {
				stroke: "rgba(250,230,50,0.3)",
				strokeWidth: 10,
			});
			line.setControlsVisibility({
				bl: false,
				br: false,
				mb: false,
				tl: false,
				tr: false,
				mtr: false
			});
			drawboard.add(line);
			drawboard.setActiveObject(line);
		});
		option.createEl("button", {text: "Rect", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			const rectangle = new fabric.Rect({
				width: 100,
				height: 100,
				stroke: 'red',
				strokeWidth: 3,
				fill: '',
				strokeUniform: true,
			});
			rectangle.setControlsVisibility({ mtr: false });
			drawboard.add(rectangle);
			drawboard.setActiveObject(rectangle);
		});
		option.createEl("button", {text: "Save", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			console.log(drawboard.toDatalessJSON())
			const buffer: string[] = []
			const canvasWidth = drawboard.width
			const canvasHeight = drawboard.height
			const elements = drawboard.toDatalessJSON().objects
			for (const element of elements) {
				switch (element.type) {
					case "rect": {
						const fractionDigit = 3;
						const strokeWidth = (element.strokeWidth / canvasWidth).toFixed(fractionDigit);
						const left = (element.left / canvasWidth).toFixed(fractionDigit);
						const top= (element.top / canvasHeight).toFixed(fractionDigit);
						const width = (element.width * element.scaleX / canvasWidth).toFixed(fractionDigit);
						const height = (element.height * element.scaleY / canvasHeight).toFixed(fractionDigit);
						buffer.push(`ctx.strokeStyle = "${element.stroke}";`);
						buffer.push(`ctx.lineWidth = W(${strokeWidth});`);
						buffer.push(`ctx.strokeRect(W(${left}), H(${top}), W(${width}), H(${height}));`);
						break;
					}

				}
			}
			output.setText(buffer.map((s) => ("@ " + s)).join("\n"));
			output.style.height = output.scrollHeight.toString()
		});


		this.registerEvent(app.workspace.on("slidenote:newcanvas", (src) => {
			image.src = src
			drawboard.setHeight(image.innerHeight);
			drawboard.setWidth(image.innerWidth);
			drawboard.renderAll();
		}));

		this.registerEvent(app.workspace.on("resize", (event) => {
			drawboard.setHeight(image.innerHeight);
			drawboard.setWidth(image.innerWidth);
			drawboard.renderAll();
		}));

	}

	async onClose() {
		// Nothing to clean up.
	}
}
