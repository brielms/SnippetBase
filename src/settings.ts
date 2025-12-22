import {App, Plugin, PluginSettingTab, Setting, Notice} from "obsidian";
import { getDeviceFingerprint } from "./licensing/license";
import { base64urlToUint8Array } from "./licensing/crypto";

interface PluginWithSettings {
	settings: SnippetBaseSettings;
	getIndexStatus(): { totalSnippets: number; lastUpdated: number; isIndexing: boolean };
	rebuildIndex(): Promise<unknown[]>;
	saveSettings(): Promise<void>;
	updateLicenseState(): Promise<void>;
	isProEnabled(): boolean;
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
	// License fields for SnippetBase Pro
	licenseKey?: string;
	installSalt?: string; // base64 encoded random salt for device fingerprinting
	boundDeviceHash?: string; // device hash bound to license on first use
	suppressMultiDeviceWarning?: boolean; // user can suppress device binding warnings
	licenseState?: {
		isPro: boolean;
		licenseId?: string;
		email?: string;
		buyerId?: string;
		seats?: number;
		checkedAt?: number;
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
	// License defaults
	suppressMultiDeviceWarning: false,
	licenseState: {
		isPro: false,
		checkedAt: 0,
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
						console.error("Failed to rebuild index:", err);
						new Notice("Failed to rebuild index (see console for details)");
					} finally {
						button.setButtonText("Rebuild index");
						button.setDisabled(false);
					}
				}));

		// SnippetBase Pro section
		new Setting(containerEl)
			.setName("SnippetBase Pro")
			.setHeading();

		// Status display
		const statusText = this.getLicenseStatusText();
		const statusEl = new Setting(containerEl)
			.setName("Status")
			.setDesc(statusText);

		// Add visual indicator for license state
		const state = this.plugin.settings.licenseState;
		if (state?.isPro) {
			statusEl.settingEl.style.borderLeft = '4px solid #10b981';
			statusEl.settingEl.style.paddingLeft = '12px';
		} else {
			statusEl.settingEl.style.borderLeft = '4px solid #ef4444';
			statusEl.settingEl.style.paddingLeft = '12px';
		}

		// License Key input
		new Setting(containerEl)
			.setName("License Key")
			.setDesc("Enter your SnippetBase Pro license key")
			.addText(text => text
				.setPlaceholder("SB1.xxxx.xxxx")
				.setValue(this.plugin.settings.licenseKey || "")
				.onChange(async (value) => {
					this.plugin.settings.licenseKey = value.trim() || undefined;
					await this.plugin.updateLicenseState();
					this.display(); // Refresh status
				}));

		// License info display (when valid)
		if (this.plugin.settings.licenseState?.isPro) {
			const state = this.plugin.settings.licenseState;
			const identity = state.email || state.buyerId || "Unknown";

			new Setting(containerEl)
				.setName("Licensed to")
				.setDesc(identity);

			new Setting(containerEl)
				.setName("Seats")
				.setDesc(`${state.seats || 1} seat${(state.seats || 1) > 1 ? 's' : ''}`);
		}

		// Device binding warning (simplified)
		if (this.plugin.settings.boundDeviceHash && this.plugin.settings.licenseState?.isPro && !this.plugin.settings.suppressMultiDeviceWarning) {
			const seats = this.plugin.settings.licenseState.seats || 1;
			const message = seats === 1
				? "This license appears to be used on multiple devices. Please buy another seat for multi-device use."
				: `This license includes ${seats} seats; consider a team key if needed.`;

			new Setting(containerEl)
				.setName("Device Notice")
				.setDesc(message)
				.addButton(button => button
					.setButtonText("Don't show again")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.suppressMultiDeviceWarning = true;
						await this.plugin.saveSettings();
						this.display();
					}));
		}

		// Advanced section
		new Setting(containerEl)
			.setName("Advanced")
			.setHeading();

		new Setting(containerEl)
			.setName("Reset device binding")
			.setDesc("Clear device binding (allows re-binding to current device)")
			.addButton(button => button
				.setButtonText("Reset binding")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.boundDeviceHash = undefined;
					await this.plugin.saveSettings();
					await this.plugin.updateLicenseState(); // Re-bind to current device
					this.display();
					new Notice("Device binding reset");
				}));

		new Setting(containerEl)
			.setName("Clear license")
			.setDesc("Clear license key and device binding")
			.addButton(button => button
				.setButtonText("Clear license")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.licenseKey = undefined;
					this.plugin.settings.boundDeviceHash = undefined;
					await this.plugin.updateLicenseState();
					this.display();
					new Notice("License cleared");
				}));
	}

	private getLicenseStatusText(): string {
		const state = this.plugin.settings.licenseState;
		console.log('[SnippetBase] License state for status:', state);

		if (!state || !state.isPro) {
			return "Pro features disabled — enter license key above";
		}

		return "✅ Pro enabled";
	}

}
