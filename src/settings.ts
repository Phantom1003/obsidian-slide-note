import { App, PluginSettingTab, Setting } from 'obsidian';
import SlideNotePlugin from './main';

export class SlideNoteSettings {
	default_link: boolean = false;
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

        new Setting(containerEl)
            .setName("Link pages by default")
            .setDesc("When turned on, pages will be linked to their document by default. Can be overridden using the 'link' parameter")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.default_link)
                .onChange((value) => {
                    this.plugin.settings.default_link = value;
                    this.plugin.saveSettings();
                }));
    }
}
