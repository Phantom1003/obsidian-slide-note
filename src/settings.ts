import { App, PluginSettingTab, Setting } from 'obsidian';
import SlideNotePlugin from './main';

export class SlideNoteSettings {
	allow_annotations: boolean = false;
	default_link: boolean = false;
	default_dpi: number = 1;
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
            .setName("Link pages by default")
            .setDesc("When turned on, pages will be linked to their document by default. Can be overridden using the 'link' parameter and 'default_link' frontmatter.")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.default_link)
                .onChange((value) => {
                    this.plugin.settings.default_link = value;
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
			.setDesc("Increase the value to improve the resolution of the slide.")
			.addText(text => text.setValue(this.plugin.settings.default_dpi.toString())
				.onChange((value) => {
					this.plugin.settings.default_dpi = parseInt(value);
					this.plugin.saveSettings();
				}));

	}
}
