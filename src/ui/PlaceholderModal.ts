// src/ui/PlaceholderModal.ts

import { App, Modal, Setting, ButtonComponent, TextComponent, DropdownComponent } from "obsidian";
import { PlaceholderSpec, PlaceholderValues } from "../snippetBase/placeholders";

interface PlaceholderUiSettings {
  hideAutofilled: boolean;
}

export class PlaceholderModal extends Modal {
  private specs: PlaceholderSpec[];
  private history: Record<string, string>;
  private uiSettings: PlaceholderUiSettings;
  private onSubmit: (values: PlaceholderValues) => void;
  private onCancel: () => void;

  private values: PlaceholderValues = {};
  private inputs: Map<string, TextComponent | DropdownComponent> = new Map();
  private fieldStates: Map<string, { isEdited: boolean; setting: Setting }> = new Map();
  private hideAutofilledToggle: boolean = false;

  constructor(
    app: App,
    specs: PlaceholderSpec[],
    history: Record<string, string>,
    uiSettings: PlaceholderUiSettings,
    onSubmit: (values: PlaceholderValues) => void,
    onCancel: () => void = () => {}
  ) {
    super(app);
    this.specs = specs;
    this.history = history;
    this.uiSettings = uiSettings;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.hideAutofilledToggle = uiSettings.hideAutofilled;
  }

  onOpen() {
    const { contentEl } = this;

    this.titleEl.setText("Fill snippet placeholders");

    // Initialize values from history and defaults, and determine prefill sources
    for (const spec of this.specs) {
      const historyValue = this.history[spec.key];
      const defaultValue = spec.defaultValue;

      // Determine actual prefill source and value
      let actualValue: string;
      let actualSource: typeof spec.prefillSource;

      if (historyValue) {
        actualValue = historyValue;
        actualSource = 'history';
      } else if (defaultValue) {
        actualValue = defaultValue;
        actualSource = spec.prefillSource; // Keep the original source (computed or explicit-default)
      } else {
        actualValue = '';
        actualSource = 'empty';
      }

      this.values[spec.key] = actualValue;
      spec.prefillSource = actualSource;
    }

    // Add toggle for hiding auto-filled fields
    const toggleSetting = new Setting(contentEl);
    toggleSetting.setName("Hide auto-filled fields");
    toggleSetting.setDesc("Hide fields that are pre-filled with computed or default values");
    toggleSetting.addToggle(toggle => toggle
      .setValue(this.hideAutofilledToggle)
      .onChange((value) => {
        this.hideAutofilledToggle = value;
        this.uiSettings.hideAutofilled = value;
        this.refreshFields();
      }));

    // Create form container
    const formContainer = contentEl.createDiv({ cls: 'snippetbase-placeholder-form' });

    // Create fields
    for (const spec of this.specs) {
      this.createField(formContainer as HTMLElement, spec);
    }

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelBtn = new ButtonComponent(buttonContainer);
    cancelBtn.setButtonText('Cancel');
    cancelBtn.setCta();
    cancelBtn.onClick(() => {
      this.onCancel();
      this.close();
    });

    const submitBtn = new ButtonComponent(buttonContainer);
    submitBtn.setButtonText('Copy filled snippet');
    submitBtn.setCta();
    submitBtn.onClick(() => {
      this.onSubmit(this.values);
      this.close();
    });

    // Focus first visible input
    this.focusFirstVisibleInput();

    // Handle Enter/Escape keys
    this.scope.register([], 'Enter', (evt) => {
      evt.preventDefault();
      this.onSubmit(this.values);
      this.close();
    });

    this.scope.register([], 'Escape', (evt) => {
      evt.preventDefault();
      this.onCancel();
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private createField(container: HTMLElement, spec: PlaceholderSpec) {
    const setting = new Setting(container);

    // Create label with badge
    const labelContainer = setting.nameEl.createDiv({ cls: 'snippetbase-ph-label-container' });
    labelContainer.setText(spec.label);

    // Add badge based on prefill source
    if (spec.prefillSource !== 'empty') {
      const badge = labelContainer.createSpan({
        cls: `snippetbase-ph-badge is-${spec.prefillSource.replace('-', '')}`
      });
      badge.setText(spec.prefillSource === 'explicit-default' ? 'default' :
                   spec.prefillSource === 'computed' ? 'auto' : 'history');
    }

    // Add hint text
    if (spec.sourceHint) {
      const hint = setting.descEl.createDiv({ cls: 'snippetbase-ph-hint' });
      hint.setText(spec.sourceHint);
    }

    let input: TextComponent | DropdownComponent;

    if (spec.type === 'select' && spec.options) {
      const dropdown = new DropdownComponent(setting.controlEl);
      input = dropdown;

      // Add options
      for (const option of spec.options) {
        dropdown.addOption(option, option);
      }

      // Set initial value
      const currentValue = this.values[spec.key];
      if (currentValue && spec.options.includes(currentValue)) {
        dropdown.setValue(currentValue);
      } else if (spec.options.length > 0) {
        dropdown.setValue(spec.options[0]!);
        this.values[spec.key] = spec.options[0]!;
      }

      dropdown.onChange(value => {
        this.values[spec.key] = value;
        this.markFieldEdited(spec.key);
      });

    } else if (spec.type === 'date') {
      const textInput = new TextComponent(setting.controlEl);
      input = textInput;

      textInput.inputEl.type = 'date';
      textInput.setValue(this.values[spec.key] || '');

      textInput.onChange(value => {
        this.values[spec.key] = value;
        this.markFieldEdited(spec.key);
      });

    } else {
      // text input (default)
      const textInput = new TextComponent(setting.controlEl);
      input = textInput;

      textInput.setPlaceholder(`Enter value for ${spec.label}`);
      textInput.setValue(this.values[spec.key] || '');

      textInput.onChange(value => {
        this.values[spec.key] = value;
        this.markFieldEdited(spec.key);
      });
    }

    this.inputs.set(spec.key, input);
    this.fieldStates.set(spec.key, { isEdited: false, setting });

    // Initially hide if needed
    this.updateFieldVisibility(spec.key);
  }

  private markFieldEdited(key: string) {
    const state = this.fieldStates.get(key);
    if (state && !state.isEdited) {
      state.isEdited = true;
      this.updateFieldVisibility(key);
    }
  }

  private updateFieldVisibility(key: string) {
    const state = this.fieldStates.get(key);
    if (!state) return;

    const spec = this.specs.find(s => s.key === key);
    if (!spec) return;

    const shouldHide = this.hideAutofilledToggle &&
                      !state.isEdited &&
                      (spec.prefillSource === 'computed' || spec.prefillSource === 'explicit-default');

    state.setting.settingEl.style.display = shouldHide ? 'none' : '';
  }

  private refreshFields() {
    for (const spec of this.specs) {
      this.updateFieldVisibility(spec.key);
    }
    this.focusFirstVisibleInput();
  }

  private focusFirstVisibleInput() {
    for (const spec of this.specs) {
      const state = this.fieldStates.get(spec.key);
      if (state && state.setting.settingEl.style.display !== 'none') {
        const input = this.inputs.get(spec.key);
        if (input instanceof TextComponent) {
          input.inputEl.focus();
          return;
        } else if (input instanceof DropdownComponent) {
          input.selectEl.focus();
          return;
        }
      }
    }
  }

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]!;
  }
}
