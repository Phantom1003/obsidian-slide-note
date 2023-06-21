import { App, PluginSettingTab, Setting } from 'obsidian';
import SlideNotePlugin from './main';

export class SlideNoteSettings {
	allow_annotations: boolean = false;
	default_text: boolean = false;
	default_dpi: number = 1;
	support_better_pdf: boolean = false;
}

export class SlideNoteSettingsTab extends PluginSettingTab {
    plugin: SlideNotePlugin;

    constructor(app: App, plugin: SlideNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl} = this;

        containerEl.empty();

		containerEl.createEl('h1', { text: 'Slide Note Settings' });

        new Setting(containerEl)
            .setName("Extract text by default")
            .setDesc("When turned on, you can select the text in the page. Can be overridden using the 'text' parameter and 'default_text' frontmatter.")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.default_text)
                .onChange((value) => {
                    this.plugin.settings.default_text = value;
                    this.plugin.saveSettings();
                }));

		new Setting(containerEl)
			.setName("Allow execute additional annotations")
			.setDesc("[WARNING] This feature may introduce security problem, only use on your personal annotations! When turned on, you can add text or draw on the slides.")
			.addToggle(toggle => toggle.setValue(this.plugin.settings.allow_annotations)
				.onChange((value) => {
					this.plugin.settings.allow_annotations = value;
					this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default DPI level")
			.setDesc("Increase the value to improve the resolution of the slide. Can be overridden using the 'dpi' parameter and 'default_dpi' frontmatter.")
			.addText(text => text.setValue(this.plugin.settings.default_dpi.toString())
				.onChange((value) => {
					this.plugin.settings.default_dpi = parseInt(value);
					this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName("Support Better PDF Code Blocks")
			.setDesc("Whether better-pdf code blocks are supported. If you previously used better-pdf, turn it on to use your legacy code blocks. Please note that you should start using slide-note code blocks as soon as possible.")
			.addToggle(toggle => toggle.setValue(this.plugin.settings.support_better_pdf)
				.onChange((value) => {
					this.plugin.settings.support_better_pdf = value;
					this.plugin.saveSettings();
				}
			));
	}
}
