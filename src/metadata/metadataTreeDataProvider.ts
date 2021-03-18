import * as vscode from 'vscode';
import * as path from 'path';
import { Config } from '../config';
import { getActiveEditor, IObservable, Observer, SupportedContent } from '../utils';
import { IFileInfo, MetadataFileCache } from './metadataFileCache';
import { MetadataTreeItem } from "./metadataTreeItem";
import { config } from 'process';


export class MarkdownMetadataTreeDataProvider extends Observer<Config> implements vscode.TreeDataProvider<MetadataTreeItem> {

  private document: vscode.TextDocument | undefined;
  private fileInfo: IFileInfo | undefined;
  public tree: vscode.TreeView<MetadataTreeItem> | undefined;

  constructor(configService: IObservable<Config>, private cache: MetadataFileCache) {
    super(configService);
  }

  getTreeItem(element: MetadataTreeItem): MetadataTreeItem {
    return element;
  }

  getChildren(element?: MetadataTreeItem): Thenable<MetadataTreeItem[]> {
    if (!this.document || !this.fileInfo) {
      return Promise.resolve([]);
    }

    let elements = element
      ? this.parseObjectTree(element.value, element)
      : this.parseObjectTree(this.fileInfo?.metadata?.value);

    // Hide the 1st level `summary` category if it is shown as message
    if (this.state.metaSummaryCategoryEnabled){
      elements = elements.filter(e => e.key !== 'summary');
    }
    const useColors = this.state.metaKeywordShowInMetadataView;
    const showLabels = this.state.metaCategoryNamesEnabled ?? false;

    elements.forEach(item => {
      let icon: string | undefined = undefined;

      let label = showLabels || item.parent
        ? item.parent?.key.toLowerCase()
        : item.key.toLowerCase();

      if (!label && item.description) {
        label = item.key.toLowerCase();
      }

      if (label && this.state.metaCategoryIconsEnabled) {
        icon = this.state.metaCategories.get(label) ?? 'debug-stackframe-dot';
        if (icon) {
          const keyword = showLabels ? item.description?.toString()?.toLowerCase() : item.label?.toLowerCase();
          let color = keyword
            ? useColors && this.state.metaKeywordColors.get(keyword)
            : undefined;

          item.iconPath = new vscode.ThemeIcon(icon, color);
        }
      }
    });

    return Promise.resolve(elements);
  }

  open() {
    const metaLocation = this.fileInfo?.metadata?.location;
    if (metaLocation) {
      vscode.commands.executeCommand('vscode.open',
        vscode.Uri.file(metaLocation),
        {
          selection: new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0))
        }
      );
    };
  }

  private isArray(object: any): boolean { return Array.isArray(object); }
  private isObject(object: any): boolean { return typeof object === 'object' && object !== null; }

  private parseObjectTree(object: any, parent?: MetadataTreeItem): MetadataTreeItem[] {
    if (object === undefined || object === null)
      return [];
    const showLabels = this.state.metaCategoryNamesEnabled ?? false;

    if (Array.isArray(object)) {
      const r: any[] = [];

      object.map((value) => {
        const result = this.parseObjectTree(value, parent);
        r.push(...result);
      });
      return r;
    }

    if (typeof object === 'object' && object !== null) {
      const props = Object.getOwnPropertyNames(object);
      if (!showLabels && props.length === 1) {
        return this.parseObjectTree(object[props[0]], new MetadataTreeItem(props[0], '', ''));
      }

      return props
        .map(key => {
          const value = object[key];
          if (Array.isArray(value)) {
            return new MetadataTreeItem(
              key,
              key,
              null,
              value,
              parent,
              vscode.TreeItemCollapsibleState.Expanded);
          }
          else
            if (typeof value === 'object' && value !== null) {
              return new MetadataTreeItem(
                key,
                key,
                null,
                value,
                parent,
                vscode.TreeItemCollapsibleState.Expanded);
            }

          return new MetadataTreeItem(
            key,
            showLabels ? key : value,
            showLabels ? value : '',
            value,
            parent,
            vscode.TreeItemCollapsibleState.None);
        });
    }

    return [new MetadataTreeItem(
      '',
      showLabels ? '' : object,
      showLabels ? object : '',
      object, parent)];
  }

  private _onDidChangeTreeData: vscode.EventEmitter<MetadataTreeItem | undefined | null | void> = new vscode.EventEmitter<MetadataTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MetadataTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): Promise<IFileInfo | undefined> {

    return new Promise((resolve, reject) => {
      this.document = vscode.window.activeTextEditor?.document;
      const meta = this.cache.get(this.document?.uri);
      if (meta) {
        if (this.tree) {
          try {
            const values = meta.metadata?.value;
            this.tree.message = '';
            if (values) {
              if (this.state.metaSummaryCategoryEnabled) {
                this.tree.message = meta.summary;
              };
            }
          } catch (error) {
            //TODO: Log error
          }
        }
      }

      this.fileInfo = meta;
      this._onDidChangeTreeData.fire();
      return resolve(this.fileInfo);
    });
  }

  clear(): void {
    this.document = undefined;
    this._onDidChangeTreeData.fire();
  }

  protected onStateChange(newState: Config) {
    super.onStateChange(newState);
    this.refresh();
  }
}
