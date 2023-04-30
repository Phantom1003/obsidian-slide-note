# Obsidian Slide Note

This repository maintains an Obsidian plugin that can help you take notes for your classes easier.

With this plugin you can write plaintext notes, and:

- keep binding with the related information
- render the slide and your annotations together
- make your notes decouple with the heavy tools

This plugin is inspired by the [better-pdf](https://github.com/MSzturc/obsidian-better-pdf-plugin), but beyond rendering PDF pages.
Slide Note provides several new features, including:

- better pdf hover preview
- graphic annotation support
- per-file frontmatter configuration
- performance optimization for huge pages
- automatic rerender when the pdf file has been modified

## Grammar

You can involve this plugin by writing a code block with the `slide-note` type.

`````markdown
```slide-note
file: example.pdf		# file path 
page: 2, 4-5, 8			# render page, default is all pages
scale: 0.2			# page scaling, default `1.0`
link: true			# page hover preview, default `false`
rotat: 90			# page rotation, default `0`
rect: W(0.069), H(0.113), W(0.861), H(0.337)	# display area, default is full page
```
`````

![basic usage](doc/basic.png)

Besides these basic uses, you can also append more statements in the block to annotate the PDF.
A string starting with @ is a graphic annotation.
Since the PDF pages are rendered as HTML canvas elements, you can use js/ts codes to append content to the page.

Slide Note provide a canvas view to help you to generate above code.
Click the slide page will launch the canvas on the right side.
You can add path, line, rectangle, text on the slide.
Once you finish your annotations, click save button to generate the code that used to render your annotations.

And all the other statements will be treated as your notes, this makes sure that all your notes bind with the page in one block.
Therefore, when you link them in other places, you can get them all.

In the end, your notes should look like the following:

![advance usage](doc/advance.png)

