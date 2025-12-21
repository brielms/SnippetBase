import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	reopenOnStartup: boolean;
	openLocation: "tab" | "right";
	favorites: Record<string, true>; // snippet ID -> true
	indexStatus: {
		totalSnippets: number;
		lastUpdated: number; // timestamp
		isIndexing: boolean;
	};
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	reopenOnStartup: false,
	openLocation: "tab",
	favorites: {},
	indexStatus: {
		totalSnippets: 0,
		lastUpdated: 0,
		isIndexing: false,
	},
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
