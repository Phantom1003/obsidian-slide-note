import { ItemView, Notice, WorkspaceLeaf } from "obsidian";

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
		const content = container.createEl("div");
		content.style.position = "relative";
		content.createEl("h1").setText("SlideNote PDF DrawBoard");

		const preview = content.createEl("div");
		preview.createEl("h4").setText("Preview:");
		const image = preview.createEl("img");
		image.alt = "Click slide to start ...";
		image.style.position = "absolute";
		image.style.width = "100%";

		function resize2Image() {
			drawboard.setHeight(image.innerHeight);
			drawboard.setWidth(image.innerWidth);
			drawboard.renderAll();
		}

		const canvas = preview.createEl("canvas");
		canvas.style.position = "absolute";
		const drawboard = new fabric.Canvas(canvas, {isDrawingMode: false});
		resize2Image();

		this.createToolbox(container, drawboard);

		drawboard.freeDrawingBrush.color = "rgba(250,230,50,0.5)";
		drawboard.freeDrawingBrush.width = 10;
		drawboard.on("selection:created", (event) => {
			const element = drawboard.getActiveObject();
			if (element && element.type == "path") {
				element.setControlsVisibility({
					bl: false, br: false,
					mb: false, ml: false, mr: false, mt: false,
					tl: false, tr: false,
					mtr: false
				});
			}
		});

		this.registerEvent(app.workspace.on("slidenote:newcanvas", (src) => {
			image.src = src;
		}));

		new ResizeObserver(resize2Image).observe(container);
	}

	async onClose() {
		// Nothing to clean up.
	}

	createToolbox(container: Element, drawboard: fabric.Canvas) {
		const option = container.createEl("div");
		option.createEl("h4").setText("Toolbox:");
		option.createEl("button", {text: "Select", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			drawboard.isDrawingMode = false;
		});
		option.createEl("button", {text: "Pen", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			drawboard.isDrawingMode = true;
		});
		option.createEl("button", {text: "Delete", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			if(drawboard.getActiveObject()){
				drawboard.getActiveObjects().forEach((element) => {
					drawboard.remove(element);
				});
				drawboard.discardActiveObject();
			}
		});
		option.createEl("button", {text: "Text", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			const textbox = new fabric.Textbox("add your text here",{
				width : 400,
				fontSize: 30,
				fontFamily: "Arial"
			});
			textbox.setControlsVisibility({
				mt: false, mb: false,
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
				bl: false, br: false,
				tl: false, tr: false,
				mtr: false
			});
			drawboard.add(line);
			drawboard.setActiveObject(line);
		});
		option.createEl("button", {text: "Rect", attr: {style: "margin-right: 4px;"}}).addEventListener("click", () => {
			const rectangle = new fabric.Rect({
				width: 100,
				height: 100,
				stroke: "red",
				strokeWidth: 3,
				fill: "",
				strokeUniform: true,
			});
			rectangle.setControlsVisibility({ mtr: false });
			drawboard.add(rectangle);
			drawboard.setActiveObject(rectangle);
		});
		const save = container.createEl("div");
		save.createEl("h4", {text: "Export:"})
		save.createEl("button", {text: "Save", attr: {style: "margin-right: 4px; margin-bottom: 8px;"}}).addEventListener("click", () => {
			const fractionDigit = 3;
			const canvasWidth = drawboard.width;
			const canvasHeight = drawboard.height;
			const elements = drawboard.toDatalessJSON().objects;
			const buffer: string[] = [];
			for (const element of elements) {
				switch (element.type) {
					case "rect": {
						const strokeWidth = (element.strokeWidth / canvasWidth).toFixed(fractionDigit);
						const left = (element.left / canvasWidth).toFixed(fractionDigit);
						const top= (element.top / canvasHeight).toFixed(fractionDigit);
						const width = (element.width * element.scaleX / canvasWidth).toFixed(fractionDigit);
						const height = (element.height * element.scaleY / canvasHeight).toFixed(fractionDigit);
						buffer.push("// rect");
						buffer.push(`ctx.strokeStyle = "${element.stroke}";`);
						buffer.push(`ctx.lineWidth = W(${strokeWidth});`);
						buffer.push(`ctx.strokeRect(W(${left}), H(${top}), W(${width}), H(${height}));`);
						break;
					}
					case "textbox": {
						const left = (element.left / canvasWidth).toFixed(fractionDigit);
						const top= ((element.top + element.height * 100/116 ) / canvasHeight).toFixed(fractionDigit);
						const fontSize = (element.fontSize * element.scaleY / canvasHeight).toFixed(fractionDigit);
						const fontFamily = element.fontFamily;
						buffer.push("// textbox");
						buffer.push(`ctx.fillStyle = "${element.fill}";`);
						buffer.push(`ctx.font=\`\${H(${fontSize})}px ${fontFamily}\`;`);
						buffer.push(`ctx.fillText("${element.text}", W(${left}), H(${top}));`);
						break;
					}
					case "line": {
						const left = (element.left / canvasWidth).toFixed(fractionDigit);
						const top= (element.top / canvasHeight).toFixed(fractionDigit);
						const width = (element.width * element.scaleX / canvasWidth).toFixed(fractionDigit);
						const height = (element.strokeWidth * element.scaleY / canvasHeight).toFixed(fractionDigit);
						buffer.push("// line");
						buffer.push(`ctx.fillStyle = "${element.stroke}";`);
						buffer.push(`ctx.fillRect(W(${left}), H(${top}), W(${width}), H(${height}));`);
						break;
					}
					case "path": {
						const strokeWidth = (element.strokeWidth * element.scaleY / canvasWidth).toFixed(fractionDigit);
						buffer.push("// path");
						buffer.push(`ctx.strokeStyle = "${element.stroke}";`);
						buffer.push(`ctx.lineWidth = W(${strokeWidth});`);
						buffer.push("ctx.beginPath();");
						const path: string[] = [];
						for (const point of element.path) {
							const x = (point[1]/canvasWidth).toFixed(fractionDigit);
							const y = (point[2]/canvasHeight).toFixed(fractionDigit);
							path.push(`ctx.lineTo(W(${x}), H(${y}));`);
						}
						buffer.push(path.join(" "));
						buffer.push("ctx.stroke();");
						break;
					}
					default:
						new Notice("SlideNote: Unknown Canvas Type!");
				}
			}
			output.setText(buffer.map((s) => ("@ " + s)).join("\n"));
			output.style.height = output.scrollHeight.toString() + "px";
		});
		save.createEl("p").setText(" Click the save button and copy generated annotations to your note.")
		const output = save.createEl("textarea", {attr: {style: "width: 100%"}})
		output.setText("Click Save button first ...");
		output.style.minHeight = "100px";
	}
}
