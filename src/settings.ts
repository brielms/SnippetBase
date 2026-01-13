import {App, Plugin, PluginSettingTab, Setting, Notice} from "obsidian";

interface PluginWithSettings {
	settings: SnippetBaseSettings;
	getIndexStatus(): { totalSnippets: number; lastUpdated: number; isIndexing: boolean };
	rebuildIndex(): Promise<unknown[]>;
	saveSettings(): Promise<void>;
}

export interface SnippetBaseSettings {
	reopenOnStartup: boolean;
	openLocation: "tab" | "right";
	favorites: Record<string, true>; // snippet ID -> true
	placeholderHistory: Record<string, string>; // placeholder key -> last used value
	placeholderUi: {
		hideAutofilled: boolean;
	};
	indexStatus: {
		totalSnippets: number;
		lastUpdated: number; // timestamp
		isIndexing: boolean;
	};
}

export const DEFAULT_SETTINGS: SnippetBaseSettings = {
	reopenOnStartup: false,
	openLocation: "tab",
	favorites: {},
	placeholderHistory: {},
	placeholderUi: {
		hideAutofilled: false,
	},
	indexStatus: {
		totalSnippets: 0,
		lastUpdated: 0,
		isIndexing: false,
	},
}

export class SnippetBaseSettingTab extends PluginSettingTab {
	plugin: PluginWithSettings;

	constructor(app: App, plugin: PluginWithSettings) {
		super(app, plugin as unknown as Plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("About")
			.setHeading();

		// Status information
		const status: { totalSnippets: number; lastUpdated: number } = this.plugin.getIndexStatus();

		new Setting(containerEl)
			.setName("Status")
			.setHeading();
		new Setting(containerEl)
			.setDesc(`${status.totalSnippets} snippets indexed${status.lastUpdated > 0 ? ` • Last updated: ${new Date(status.lastUpdated).toLocaleString()}` : ''}`);

		// Settings
		new Setting(containerEl)
			.setName("Reopen on startup")
			.setDesc("Automatically open snippet base when Obsidian starts")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.reopenOnStartup)
				.onChange(async (value) => {
					this.plugin.settings.reopenOnStartup = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default open location")
			.setDesc("Where to open snippet base by default")
			.addDropdown(dropdown => dropdown
				.addOption("tab", "New tab")
				.addOption("right", "Right sidebar")
				.setValue(this.plugin.settings.openLocation)
				.onChange(async (value: "tab" | "right") => {
					this.plugin.settings.openLocation = value;
					await this.plugin.saveSettings();
				}));

		// Actions
		new Setting(containerEl)
			.setName("Actions")
			.setHeading();

		new Setting(containerEl)
			.setName("Rebuild snippet index")
			.setDesc("Manually rebuild the snippet database")
			.addButton(button => button
				.setButtonText("Rebuild index")
				.setCta()
				.onClick(async () => {
					button.setButtonText("Rebuilding...");
					button.setDisabled(true);

					try {
						const recs = await this.plugin.rebuildIndex();
						new Notice(`Rebuilt index: ${recs.length} snippets found`);
						this.display(); // Refresh to show updated status
					} catch (err: unknown) {
						console.warn("Failed to rebuild index:", err);
						new Notice("Failed to rebuild index (see console for details)");
					} finally {
						button.setButtonText("Rebuild index");
						button.setDisabled(false);
					}
				}));

	}


}
