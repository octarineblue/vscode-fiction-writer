import { Observable, Constants, DialogueMarkerMappings, OutputFormats, KnownColor } from '../utils';
import { ConfigurationChangeEvent, ThemeColor, ThemeIcon, workspace, WorkspaceConfiguration } from 'vscode';
import { Config, IContextConfig, IKvp } from './interfaces';
import { ContextService } from './contextService';

export class ConfigService extends Observable<Config> {
  private config?: Config;

  constructor(private localSettings: ContextService) {
    super();
    this.reload();
  }

  getState(): Config {
    if (!this.config) {
      throw new Error('Configuration is not set!');
    }

    return { ...this.config };
  }

  read<T>(config: WorkspaceConfiguration, key: string, fallback: T): T {
    return config.get<T>(key, fallback);
  }

  reload(event?: ConfigurationChangeEvent) {
    const editing = workspace.getConfiguration('markdown-fiction-writer.edit');
    const editDialogue = workspace.getConfiguration('markdown-fiction-writer.editDialogue');
    const exporting = workspace.getConfiguration('markdown-fiction-writer.export');
    const view = workspace.getConfiguration('markdown-fiction-writer.view');
    const metadata = workspace.getConfiguration('markdown-fiction-writer.metadata');
    const formatting = workspace.getConfiguration('markdown-fiction-writer.textFormatting');
    const smartEdit = workspace.getConfiguration('markdown-fiction-writer.smartEdit');

    const dialoguePrefix = DialogueMarkerMappings[this.read<string>(editDialogue, 'marker', Constants.Dialogue.TWODASH)] ?? '';
    const isDialogueEnabled = dialoguePrefix !== '';
    let config : Config = new Config();

    // event responsible for changing the configuration
    config.changeEvent = event;

    // configuration keys
    config.keybindingsDisabled = this.read<boolean>(editing, 'disableKeybindings', false);
    config.inverseEnter = this.read<string>(editing, 'easyParagraphCreation', Constants.Paragraph.NEW_ON_ENTER)
      === Constants.Paragraph.NEW_ON_ENTER;
    config.dialoguePrefix = dialoguePrefix;
    config.dialogueMarkerAutoReplace = this.read<boolean>(editDialogue, 'markerAutoReplace', true);
    config.dialogueMarkerAutoDetect = false;
    config.dialogueIndentAutoDetect = this.read<boolean>(editDialogue, 'sentenceIndentAutoDetect', true);
    config.dialgoueIndentLength = this.read<number>(editDialogue, 'sentenceIndentAutoDetect', 0);

    // EXPORT

    config.compileTemplateFile = this.read<string>(exporting, 'outputTemplate.file', '');
    config.compileUseTemplateFile = this.read<boolean>(exporting, 'outputTemplate.enabled', false);
    config.compileOutputFormat = this.read<string>(exporting, 'outputFormat.default', OutputFormats['odt']);
    config.compileShowFormatPicker = this.read<boolean>(exporting, 'outputFormat.alwaysShowFormatPicker', true);
    config.compileEmDash = this.read<boolean>(exporting, 'smartDeshes', true);
    config.compileShowSaveDialogue = this.read<string>(exporting, 'showSaveDialogue', Constants.Compile.SaveDialogue.ALWAYS) === Constants.Compile.SaveDialogue.ALWAYS;
    config.compileSkipCommentsFromToc = this.read<boolean>(exporting, 'skipCommentsFromToc', true);
    config.compileTocFilename = this.read<string>(exporting, 'tocFilename', 'toc.md');
    config.compileShowsErrorInOutputFile = this.read<boolean>(exporting, 'include.showsErrorInOutputFile', true);
    config.compileIncludeIsEnabled = this.read<boolean>(exporting, 'include.enabled', true);
    config.compileSearchDocumentIdsInAllOpened = this.read<boolean>(exporting, 'include.searchDocumentIdsInAllOpenFilesAndWorkspaces', false);

    // FORMATTING

    config.formattingIsEnabled = this.read<boolean>(formatting, 'enabled', true);
    config.formattingFixMismatchDialogueMarkers = this.read<boolean>(formatting, 'fixMismatchDialogueMarkers', true);
    config.formattingFixDialogueIndents = this.read<boolean>(formatting, 'fixDialogueIndents', true);
    config.formattingFixParagraphSpacing = this.read<boolean>(formatting, 'fixParagraphSpacing', true);
    config.formattingFixParagraphBreaks = this.read<string>(formatting, 'fixParagraphBreaks', Constants.Format.ParagraphBreaks.NONE);
    config.formattingRemoveExtraSpaces = this.read<boolean>(formatting, 'removeExtraSpaces', true);
    config.formattingRemoveExtraLines = this.read<boolean>(formatting, 'removeExtraLines', true);
    config.formattingRemoveTrailingSpaces = this.read<boolean>(formatting, 'removeTrailingSpaces', true);

    config.viewFileTags = this.read<{ [key: string]: string }>(view, 'fileTags.definitions', {});
    config.viewDialogueHighlight = this.read<boolean>(view, 'highlight.textBetweenQuotes', false);
    config.viewDialogueHighlightMarkers = this.read<boolean>(view, 'highlight.dialogueMarkers', true);
    config.viewFadeMetadata = this.read<boolean>(view, 'fadeMetadata', true);
    config.viewZenModeEnabled = this.read<boolean>(view, 'writingMode.enabled', false);
    config.viewZenModeTheme = this.read<string>(view, 'writingMode.theme', '');
    config.viewZenModeFontSize = this.read<number>(view, 'writingMode.fontSize', 0);
    config.wrapIndent = this.read<number>(view, 'wordWrapIndent', 0);

    config.foldSentences = this.read<boolean>(view, 'foldParagraphLines', true);
    config.viewStatusBarEnabled = this.read<boolean>(view, 'statusBar.enabled', true);

    config.isDialogueEnabled = isDialogueEnabled;
    config.dialgoueIndent = '';


    // SMART EDIT

    config.smartEditEnabled = this.read<boolean>(smartEdit, 'enabled', false);
    config.smartEditRenameRelated = this.read<string>(smartEdit, 'renameRelatedFiles', Constants.RenameRelated.ASK);

    // METADATA

    config.metaEnabled = this.read<boolean>(metadata, 'enabled', true);

    config.metaKeywordColors = new Map<string, ThemeColor>();
    config.metaKeywordShowInFileExplorer = this.read<boolean>(metadata, 'keywords.colorsInFileExplorer', true) && config.metaEnabled;
    config.metaKeywordShowInMetadataView = this.read<boolean>(metadata, 'keywords.colorsInMetadataView', true) && config.metaEnabled;

    config.metaCategories = new Map<string, string>();
    config.metaCategoryIconsEnabled = this.read<boolean>(metadata, 'categories.showIcons', true) && config.metaEnabled;
    config.metaCategoryNamesEnabled = this.read<boolean>(metadata, 'categories.showNames', true) && config.metaEnabled;
    config.metaSummaryCategoryName = this.read<string>(metadata, 'summaryCategoryName', 'summary');

    config.metaEasyLists = this.read<string>(metadata, 'easyLists', ',');
    config.metaDefaultCategory = this.read<string>(metadata, 'defaultCategory', 'tags');
    config.metaKeywordBadgeCategory = this.read<string>(metadata, 'keywords.badgesCategory', 'tags');
    config.metaKeywordColorCategory = this.read<string>(metadata, 'keywords.colorsCategory', 'tags');
    config.metaFileBadges = new Map<string, string>();
    config.metaKeywordsShowBadges = this.read<boolean>(metadata, 'keywords.badgesInFileExplorer', true) && config.metaEnabled;

    const metaKeywordColors = this.read<IKvp<KnownColor>>(
      metadata,
      'keywords.colors',
      {}
    );

    for (const [key, val] of Object.entries(metaKeywordColors)) {
      if (val && val !== KnownColor.NONE) {
        config.metaKeywordColors.set(key.toLowerCase(), new ThemeColor(`fictionwriter.${val}`));
      }
    };

    const metaFileBadges = this.read<IKvp<string>>(
      metadata,
      'keywords.badges',
      {}
    );

    for (const [key, val] of Object.entries(metaFileBadges)) {
      if (val) {
        config.metaFileBadges.set(key.toLowerCase(), val.substring(0, 2));
      }
    };

    const metaCatIcons = this.read<IKvp<string>>(
      metadata,
      'categories.icons',
      {}
    );

    for (const [key, val] of Object.entries(metaCatIcons)) {
      if (val) {
        config.metaCategories.set(key.toLowerCase(), val);
      }
    };


    // Disable dialogue related settings
    if (!isDialogueEnabled) {
      config.dialgoueIndent = '';
      config.dialogueIndentAutoDetect = false;
      config.dialgoueIndentLength = 0;
      config.dialogueMarkerAutoReplace = false;
      config.dialogueMarkerAutoDetect = false;
      config.formattingFixDialogueIndents = false;
      config.formattingFixMismatchDialogueMarkers = false;
    } else {
      config.dialgoueIndent = ' '.repeat(
        (config.dialgoueIndentLength < 0 || config.dialogueIndentAutoDetect)
          ? config.dialoguePrefix.length
          : config.dialgoueIndentLength);
    };

    // TODO: Move some settings to extension settings.
    let localSettings = this.localSettings.getValue<IContextConfig>('config', {});
    this.config = { ...config, ...localSettings };
    // Notify observers
    this.notify();
  }

  setLocal<T extends string | number | boolean | undefined | { [key: string]: string }>(key: string, value: T) {
    if (!this.config) { return; }

    this.config[key] = value;

    let localConfig = this.localSettings.getValue<IContextConfig>('config', {});
    localConfig[key] = value;
    this.localSettings.setValue<IContextConfig>('config', localConfig);

    this.notify();
  }

  getFlag(key: string): boolean {
    return this.localSettings.getValue<boolean>(key, false);
  }

  setFlag(key: string) { this.localSettings.setValue<boolean>(key, true); }
  usetFlag(key: string) { this.localSettings.setValue<boolean>(key, false); }

  backup(config: string, key: string): any {
    const value = workspace.getConfiguration(config).get(key);
    this.localSettings.setValue(
      `${config}.${key}`,
      value
    );

    return value;
  }

  restore(config: string, key: string) {
    const storedValue = this.localSettings.getValue(
      `${config}.${key}`,
      undefined);

    if (storedValue) {
      workspace.getConfiguration(config).update(
        key,
        storedValue);
    }
  }
}