import { Directive, TemplateRef, EventEmitter, Component, NgZone, Renderer2, Input, Output, ContentChild, ViewChild, NgModule } from '@angular/core';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';

/**
 * fileEntry is an instance of {@link FileSystemFileEntry} or {@link FileSystemDirectoryEntry}.
 * Which one is it can be checked using {@link FileSystemEntry.isFile} or {@link FileSystemEntry.isDirectory}
 * properties of the given {@link FileSystemEntry}.
 */
class NgxFileDropEntry {
    constructor(relativePath, fileEntry) {
        this.relativePath = relativePath;
        this.fileEntry = fileEntry;
    }
}

class NgxFileDropContentTemplateDirective {
    constructor(template) {
        this.template = template;
    }
}
NgxFileDropContentTemplateDirective.decorators = [
    { type: Directive, args: [{ selector: '[ngx-file-drop-content-tmp]' },] }
];
NgxFileDropContentTemplateDirective.ctorParameters = () => [
    { type: TemplateRef }
];

class NgxFileDropComponent {
    constructor(zone, renderer) {
        this.zone = zone;
        this.renderer = renderer;
        this.accept = '*';
        this.directory = false;
        this.multiple = true;
        this.dropZoneLabel = '';
        this.dropZoneClassName = 'ngx-file-drop__drop-zone';
        this.useDragEnter = false;
        this.contentClassName = 'ngx-file-drop__content';
        this.showBrowseBtn = false;
        this.browseBtnClassName = 'btn btn-primary btn-xs ngx-file-drop__browse-btn';
        this.browseBtnLabel = 'Browse files';
        this.onFileDrop = new EventEmitter();
        this.onFileOver = new EventEmitter();
        this.onFileLeave = new EventEmitter();
        this.isDraggingOverDropZone = false;
        this.globalDraggingInProgress = false;
        this.files = [];
        this.numOfActiveReadEntries = 0;
        this.helperFormEl = null;
        this.fileInputPlaceholderEl = null;
        this.dropEventTimerSubscription = null;
        this._disabled = false;
        this.openFileSelector = (event) => {
            if (this.fileSelector && this.fileSelector.nativeElement) {
                this.fileSelector.nativeElement.click();
            }
        };
        this.globalDragStartListener = this.renderer.listen('document', 'dragstart', (evt) => {
            this.globalDraggingInProgress = true;
        });
        this.globalDragEndListener = this.renderer.listen('document', 'dragend', (evt) => {
            this.globalDraggingInProgress = false;
        });
    }
    get disabled() { return this._disabled; }
    set disabled(value) {
        this._disabled = (value != null && `${value}` !== 'false');
    }
    ngOnDestroy() {
        if (this.dropEventTimerSubscription) {
            this.dropEventTimerSubscription.unsubscribe();
            this.dropEventTimerSubscription = null;
        }
        this.globalDragStartListener();
        this.globalDragEndListener();
        this.files = [];
        this.helperFormEl = null;
        this.fileInputPlaceholderEl = null;
    }
    onDragOver(event) {
        if (this.useDragEnter) {
            this.preventAndStop(event);
        }
        else if (!this.isDropzoneDisabled() && !this.useDragEnter) {
            if (!this.isDraggingOverDropZone) {
                this.isDraggingOverDropZone = true;
                this.onFileOver.emit(event);
            }
            this.preventAndStop(event);
        }
    }
    onDragEnter(event) {
        if (!this.isDropzoneDisabled() && this.useDragEnter) {
            if (!this.isDraggingOverDropZone) {
                this.isDraggingOverDropZone = true;
                this.onFileOver.emit(event);
            }
            this.preventAndStop(event);
        }
    }
    onDragLeave(event) {
        if (!this.isDropzoneDisabled()) {
            if (this.isDraggingOverDropZone) {
                this.isDraggingOverDropZone = false;
                this.onFileLeave.emit(event);
            }
            this.preventAndStop(event);
        }
    }
    dropFiles(event) {
        if (!this.isDropzoneDisabled()) {
            this.isDraggingOverDropZone = false;
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
                let items;
                if (event.dataTransfer.items) {
                    items = event.dataTransfer.items;
                }
                else {
                    items = event.dataTransfer.files;
                }
                this.preventAndStop(event);
                this.checkFiles(items);
            }
        }
    }
    /**
     * Processes the change event of the file input and adds the given files.
     * @param Event event
     */
    uploadFiles(event) {
        if (!this.isDropzoneDisabled()) {
            if (event.target) {
                const items = event.target.files || [];
                this.checkFiles(items);
                this.resetFileInput();
            }
        }
    }
    checkFiles(items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let entry = null;
            if (this.canGetAsEntry(item)) {
                entry = item.webkitGetAsEntry();
            }
            if (!entry) {
                if (item) {
                    const fakeFileEntry = {
                        name: item.name,
                        isDirectory: false,
                        isFile: true,
                        file: (callback) => {
                            callback(item);
                        },
                    };
                    const toUpload = new NgxFileDropEntry(fakeFileEntry.name, fakeFileEntry);
                    this.addToQueue(toUpload);
                }
            }
            else {
                if (entry.isFile) {
                    const toUpload = new NgxFileDropEntry(entry.name, entry);
                    this.addToQueue(toUpload);
                }
                else if (entry.isDirectory) {
                    this.traverseFileTree(entry, entry.name);
                }
            }
        }
        if (this.dropEventTimerSubscription) {
            this.dropEventTimerSubscription.unsubscribe();
        }
        this.dropEventTimerSubscription = timer(200, 200)
            .subscribe(() => {
            if (this.files.length > 0 && this.numOfActiveReadEntries === 0) {
                const files = this.files;
                this.files = [];
                this.onFileDrop.emit(files);
            }
        });
    }
    traverseFileTree(item, path) {
        if (item.isFile) {
            const toUpload = new NgxFileDropEntry(path, item);
            this.files.push(toUpload);
        }
        else {
            path = path + '/';
            const dirReader = item.createReader();
            let entries = [];
            const readEntries = () => {
                this.numOfActiveReadEntries++;
                dirReader.readEntries((result) => {
                    if (!result.length) {
                        // add empty folders
                        if (entries.length === 0) {
                            const toUpload = new NgxFileDropEntry(path, item);
                            this.zone.run(() => {
                                this.addToQueue(toUpload);
                            });
                        }
                        else {
                            for (let i = 0; i < entries.length; i++) {
                                this.zone.run(() => {
                                    this.traverseFileTree(entries[i], path + entries[i].name);
                                });
                            }
                        }
                    }
                    else {
                        // continue with the reading
                        entries = entries.concat(result);
                        readEntries();
                    }
                    this.numOfActiveReadEntries--;
                });
            };
            readEntries();
        }
    }
    /**
     * Clears any added files from the file input element so the same file can subsequently be added multiple times.
     */
    resetFileInput() {
        if (this.fileSelector && this.fileSelector.nativeElement) {
            const fileInputEl = this.fileSelector.nativeElement;
            const fileInputContainerEl = fileInputEl.parentElement;
            const helperFormEl = this.getHelperFormElement();
            const fileInputPlaceholderEl = this.getFileInputPlaceholderElement();
            // Just a quick check so we do not mess up the DOM (will never happen though).
            if (fileInputContainerEl !== helperFormEl) {
                // Insert the form input placeholder in the DOM before the form input element.
                this.renderer.insertBefore(fileInputContainerEl, fileInputPlaceholderEl, fileInputEl);
                // Add the form input as child of the temporary form element, removing the form input from the DOM.
                this.renderer.appendChild(helperFormEl, fileInputEl);
                // Reset the form, thus clearing the input element of any files.
                helperFormEl.reset();
                // Add the file input back to the DOM in place of the file input placeholder element.
                this.renderer.insertBefore(fileInputContainerEl, fileInputEl, fileInputPlaceholderEl);
                // Remove the input placeholder from the DOM
                this.renderer.removeChild(fileInputContainerEl, fileInputPlaceholderEl);
            }
        }
    }
    /**
     * Get a cached HTML form element as a helper element to clear the file input element.
     */
    getHelperFormElement() {
        if (!this.helperFormEl) {
            this.helperFormEl = this.renderer.createElement('form');
        }
        return this.helperFormEl;
    }
    /**
     * Get a cached HTML div element to be used as placeholder for the file input element when clearing said element.
     */
    getFileInputPlaceholderElement() {
        if (!this.fileInputPlaceholderEl) {
            this.fileInputPlaceholderEl = this.renderer.createElement('div');
        }
        return this.fileInputPlaceholderEl;
    }
    canGetAsEntry(item) {
        return !!item.webkitGetAsEntry;
    }
    isDropzoneDisabled() {
        return (this.globalDraggingInProgress || this.disabled);
    }
    addToQueue(item) {
        this.files.push(item);
    }
    preventAndStop(event) {
        event.stopPropagation();
        event.preventDefault();
    }
}
NgxFileDropComponent.decorators = [
    { type: Component, args: [{
                selector: 'ngx-file-drop',
                template: "<div [className]=\"dropZoneClassName\"\n     [class.ngx-file-drop__drop-zone--over]=\"isDraggingOverDropZone\"\n     (drop)=\"dropFiles($event)\"\n     (dragover)=\"onDragOver($event)\"\n     (dragenter)=\"onDragEnter($event)\"\n     (dragleave)=\"onDragLeave($event)\">\n  <div [className]=\"contentClassName\">\n    <input \n      type=\"file\" \n      #fileSelector \n      [accept]=\"accept\" \n      [attr.directory]=\"directory || undefined\" \n      [attr.webkitdirectory]=\"directory || undefined\"\n      [attr.mozdirectory]=\"directory || undefined\"\n      [attr.msdirectory]=\"directory || undefined\"\n      [attr.odirectory]=\"directory || undefined\"\n      [multiple]=\"multiple\"\n      (change)=\"uploadFiles($event)\" \n      class=\"ngx-file-drop__file-input\" \n    />\n\n    <ng-template #defaultContentTemplate>\n      <div *ngIf=\"dropZoneLabel\" class=\"ngx-file-drop__drop-zone-label\">{{dropZoneLabel}}</div>\n      <div *ngIf=\"showBrowseBtn\">\n        <input type=\"button\" [className]=\"browseBtnClassName\" value=\"{{browseBtnLabel}}\" (click)=\"openFileSelector($event)\" />\n      </div>\n    </ng-template>\n\n    <ng-template\n      [ngTemplateOutlet]=\"contentTemplate || defaultContentTemplate\"\n      [ngTemplateOutletContext]=\"{ openFileSelector: openFileSelector }\">\n    </ng-template>\n  </div>\n</div>\n",
                styles: [".ngx-file-drop__drop-zone{border:2px dotted #0782d0;border-radius:30px;height:100px;margin:auto}.ngx-file-drop__drop-zone--over{background-color:hsla(0,0%,57.6%,.5)}.ngx-file-drop__content{align-items:center;color:#0782d0;display:flex;height:100px;justify-content:center}.ngx-file-drop__drop-zone-label{text-align:center}.ngx-file-drop__file-input{display:none}"]
            },] }
];
NgxFileDropComponent.ctorParameters = () => [
    { type: NgZone },
    { type: Renderer2 }
];
NgxFileDropComponent.propDecorators = {
    accept: [{ type: Input }],
    directory: [{ type: Input }],
    multiple: [{ type: Input }],
    dropZoneLabel: [{ type: Input }],
    dropZoneClassName: [{ type: Input }],
    useDragEnter: [{ type: Input }],
    contentClassName: [{ type: Input }],
    showBrowseBtn: [{ type: Input }],
    browseBtnClassName: [{ type: Input }],
    browseBtnLabel: [{ type: Input }],
    onFileDrop: [{ type: Output }],
    onFileOver: [{ type: Output }],
    onFileLeave: [{ type: Output }],
    contentTemplate: [{ type: ContentChild, args: [NgxFileDropContentTemplateDirective, { read: TemplateRef },] }],
    fileSelector: [{ type: ViewChild, args: ['fileSelector', { static: true },] }],
    disabled: [{ type: Input }]
};

class NgxFileDropModule {
}
NgxFileDropModule.decorators = [
    { type: NgModule, args: [{
                declarations: [
                    NgxFileDropComponent,
                    NgxFileDropContentTemplateDirective,
                ],
                imports: [
                    CommonModule
                ],
                exports: [
                    NgxFileDropComponent,
                    NgxFileDropContentTemplateDirective,
                ],
                providers: [],
                bootstrap: [
                    NgxFileDropComponent
                ],
            },] }
];

/**
 * Generated bundle index. Do not edit.
 */

export { NgxFileDropComponent, NgxFileDropContentTemplateDirective, NgxFileDropEntry, NgxFileDropModule };
//# sourceMappingURL=ngx-file-drop.js.map
