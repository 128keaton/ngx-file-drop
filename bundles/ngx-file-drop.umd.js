(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('rxjs'), require('@angular/common')) :
    typeof define === 'function' && define.amd ? define('ngx-file-drop', ['exports', '@angular/core', 'rxjs', '@angular/common'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['ngx-file-drop'] = {}, global.ng.core, global.rxjs, global.ng.common));
}(this, (function (exports, core, rxjs, common) { 'use strict';

    /**
     * fileEntry is an instance of {@link FileSystemFileEntry} or {@link FileSystemDirectoryEntry}.
     * Which one is it can be checked using {@link FileSystemEntry.isFile} or {@link FileSystemEntry.isDirectory}
     * properties of the given {@link FileSystemEntry}.
     */
    var NgxFileDropEntry = /** @class */ (function () {
        function NgxFileDropEntry(relativePath, fileEntry) {
            this.relativePath = relativePath;
            this.fileEntry = fileEntry;
        }
        return NgxFileDropEntry;
    }());

    var NgxFileDropContentTemplateDirective = /** @class */ (function () {
        function NgxFileDropContentTemplateDirective(template) {
            this.template = template;
        }
        return NgxFileDropContentTemplateDirective;
    }());
    NgxFileDropContentTemplateDirective.decorators = [
        { type: core.Directive, args: [{ selector: '[ngx-file-drop-content-tmp]' },] }
    ];
    NgxFileDropContentTemplateDirective.ctorParameters = function () { return [
        { type: core.TemplateRef }
    ]; };

    var NgxFileDropComponent = /** @class */ (function () {
        function NgxFileDropComponent(zone, renderer) {
            var _this = this;
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
            this.onFileDrop = new core.EventEmitter();
            this.onFileOver = new core.EventEmitter();
            this.onFileLeave = new core.EventEmitter();
            this.isDraggingOverDropZone = false;
            this.globalDraggingInProgress = false;
            this.files = [];
            this.numOfActiveReadEntries = 0;
            this.helperFormEl = null;
            this.fileInputPlaceholderEl = null;
            this.dropEventTimerSubscription = null;
            this._disabled = false;
            this.openFileSelector = function (event) {
                if (_this.fileSelector && _this.fileSelector.nativeElement) {
                    _this.fileSelector.nativeElement.click();
                }
            };
            this.globalDragStartListener = this.renderer.listen('document', 'dragstart', function (evt) {
                _this.globalDraggingInProgress = true;
            });
            this.globalDragEndListener = this.renderer.listen('document', 'dragend', function (evt) {
                _this.globalDraggingInProgress = false;
            });
        }
        Object.defineProperty(NgxFileDropComponent.prototype, "disabled", {
            get: function () { return this._disabled; },
            set: function (value) {
                this._disabled = (value != null && "" + value !== 'false');
            },
            enumerable: false,
            configurable: true
        });
        NgxFileDropComponent.prototype.ngOnDestroy = function () {
            if (this.dropEventTimerSubscription) {
                this.dropEventTimerSubscription.unsubscribe();
                this.dropEventTimerSubscription = null;
            }
            this.globalDragStartListener();
            this.globalDragEndListener();
            this.files = [];
            this.helperFormEl = null;
            this.fileInputPlaceholderEl = null;
        };
        NgxFileDropComponent.prototype.onDragOver = function (event) {
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
        };
        NgxFileDropComponent.prototype.onDragEnter = function (event) {
            if (!this.isDropzoneDisabled() && this.useDragEnter) {
                if (!this.isDraggingOverDropZone) {
                    this.isDraggingOverDropZone = true;
                    this.onFileOver.emit(event);
                }
                this.preventAndStop(event);
            }
        };
        NgxFileDropComponent.prototype.onDragLeave = function (event) {
            if (!this.isDropzoneDisabled()) {
                if (this.isDraggingOverDropZone) {
                    this.isDraggingOverDropZone = false;
                    this.onFileLeave.emit(event);
                }
                this.preventAndStop(event);
            }
        };
        NgxFileDropComponent.prototype.dropFiles = function (event) {
            if (!this.isDropzoneDisabled()) {
                this.isDraggingOverDropZone = false;
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'copy';
                    var items = void 0;
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
        };
        /**
         * Processes the change event of the file input and adds the given files.
         * @param Event event
         */
        NgxFileDropComponent.prototype.uploadFiles = function (event) {
            if (!this.isDropzoneDisabled()) {
                if (event.target) {
                    var items = event.target.files || [];
                    this.checkFiles(items);
                    this.resetFileInput();
                }
            }
        };
        NgxFileDropComponent.prototype.checkFiles = function (items) {
            var _this = this;
            var _loop_1 = function (i) {
                var item = items[i];
                var entry = null;
                if (this_1.canGetAsEntry(item)) {
                    entry = item.webkitGetAsEntry();
                }
                if (!entry) {
                    if (item) {
                        var fakeFileEntry = {
                            name: item.name,
                            isDirectory: false,
                            isFile: true,
                            file: function (callback) {
                                callback(item);
                            },
                        };
                        var toUpload = new NgxFileDropEntry(fakeFileEntry.name, fakeFileEntry);
                        this_1.addToQueue(toUpload);
                    }
                }
                else {
                    if (entry.isFile) {
                        var toUpload = new NgxFileDropEntry(entry.name, entry);
                        this_1.addToQueue(toUpload);
                    }
                    else if (entry.isDirectory) {
                        this_1.traverseFileTree(entry, entry.name);
                    }
                }
            };
            var this_1 = this;
            for (var i = 0; i < items.length; i++) {
                _loop_1(i);
            }
            if (this.dropEventTimerSubscription) {
                this.dropEventTimerSubscription.unsubscribe();
            }
            this.dropEventTimerSubscription = rxjs.timer(200, 200)
                .subscribe(function () {
                if (_this.files.length > 0 && _this.numOfActiveReadEntries === 0) {
                    var files = _this.files;
                    _this.files = [];
                    _this.onFileDrop.emit(files);
                }
            });
        };
        NgxFileDropComponent.prototype.traverseFileTree = function (item, path) {
            var _this = this;
            if (item.isFile) {
                var toUpload = new NgxFileDropEntry(path, item);
                this.files.push(toUpload);
            }
            else {
                path = path + '/';
                var dirReader_1 = item.createReader();
                var entries_1 = [];
                var readEntries_1 = function () {
                    _this.numOfActiveReadEntries++;
                    dirReader_1.readEntries(function (result) {
                        if (!result.length) {
                            // add empty folders
                            if (entries_1.length === 0) {
                                var toUpload_1 = new NgxFileDropEntry(path, item);
                                _this.zone.run(function () {
                                    _this.addToQueue(toUpload_1);
                                });
                            }
                            else {
                                var _loop_2 = function (i) {
                                    _this.zone.run(function () {
                                        _this.traverseFileTree(entries_1[i], path + entries_1[i].name);
                                    });
                                };
                                for (var i = 0; i < entries_1.length; i++) {
                                    _loop_2(i);
                                }
                            }
                        }
                        else {
                            // continue with the reading
                            entries_1 = entries_1.concat(result);
                            readEntries_1();
                        }
                        _this.numOfActiveReadEntries--;
                    });
                };
                readEntries_1();
            }
        };
        /**
         * Clears any added files from the file input element so the same file can subsequently be added multiple times.
         */
        NgxFileDropComponent.prototype.resetFileInput = function () {
            if (this.fileSelector && this.fileSelector.nativeElement) {
                var fileInputEl = this.fileSelector.nativeElement;
                var fileInputContainerEl = fileInputEl.parentElement;
                var helperFormEl = this.getHelperFormElement();
                var fileInputPlaceholderEl = this.getFileInputPlaceholderElement();
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
        };
        /**
         * Get a cached HTML form element as a helper element to clear the file input element.
         */
        NgxFileDropComponent.prototype.getHelperFormElement = function () {
            if (!this.helperFormEl) {
                this.helperFormEl = this.renderer.createElement('form');
            }
            return this.helperFormEl;
        };
        /**
         * Get a cached HTML div element to be used as placeholder for the file input element when clearing said element.
         */
        NgxFileDropComponent.prototype.getFileInputPlaceholderElement = function () {
            if (!this.fileInputPlaceholderEl) {
                this.fileInputPlaceholderEl = this.renderer.createElement('div');
            }
            return this.fileInputPlaceholderEl;
        };
        NgxFileDropComponent.prototype.canGetAsEntry = function (item) {
            return !!item.webkitGetAsEntry;
        };
        NgxFileDropComponent.prototype.isDropzoneDisabled = function () {
            return (this.globalDraggingInProgress || this.disabled);
        };
        NgxFileDropComponent.prototype.addToQueue = function (item) {
            this.files.push(item);
        };
        NgxFileDropComponent.prototype.preventAndStop = function (event) {
            event.stopPropagation();
            event.preventDefault();
        };
        return NgxFileDropComponent;
    }());
    NgxFileDropComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'ngx-file-drop',
                    template: "<div [className]=\"dropZoneClassName\"\n     [class.ngx-file-drop__drop-zone--over]=\"isDraggingOverDropZone\"\n     (drop)=\"dropFiles($event)\"\n     (dragover)=\"onDragOver($event)\"\n     (dragenter)=\"onDragEnter($event)\"\n     (dragleave)=\"onDragLeave($event)\">\n  <div [className]=\"contentClassName\">\n    <input \n      type=\"file\" \n      #fileSelector \n      [accept]=\"accept\" \n      [attr.directory]=\"directory || undefined\" \n      [attr.webkitdirectory]=\"directory || undefined\"\n      [attr.mozdirectory]=\"directory || undefined\"\n      [attr.msdirectory]=\"directory || undefined\"\n      [attr.odirectory]=\"directory || undefined\"\n      [multiple]=\"multiple\"\n      (change)=\"uploadFiles($event)\" \n      class=\"ngx-file-drop__file-input\" \n    />\n\n    <ng-template #defaultContentTemplate>\n      <div *ngIf=\"dropZoneLabel\" class=\"ngx-file-drop__drop-zone-label\">{{dropZoneLabel}}</div>\n      <div *ngIf=\"showBrowseBtn\">\n        <input type=\"button\" [className]=\"browseBtnClassName\" value=\"{{browseBtnLabel}}\" (click)=\"openFileSelector($event)\" />\n      </div>\n    </ng-template>\n\n    <ng-template\n      [ngTemplateOutlet]=\"contentTemplate || defaultContentTemplate\"\n      [ngTemplateOutletContext]=\"{ openFileSelector: openFileSelector }\">\n    </ng-template>\n  </div>\n</div>\n",
                    styles: [".ngx-file-drop__drop-zone{border:2px dotted #0782d0;border-radius:30px;height:100px;margin:auto}.ngx-file-drop__drop-zone--over{background-color:hsla(0,0%,57.6%,.5)}.ngx-file-drop__content{align-items:center;color:#0782d0;display:flex;height:100px;justify-content:center}.ngx-file-drop__drop-zone-label{text-align:center}.ngx-file-drop__file-input{display:none}"]
                },] }
    ];
    NgxFileDropComponent.ctorParameters = function () { return [
        { type: core.NgZone },
        { type: core.Renderer2 }
    ]; };
    NgxFileDropComponent.propDecorators = {
        accept: [{ type: core.Input }],
        directory: [{ type: core.Input }],
        multiple: [{ type: core.Input }],
        dropZoneLabel: [{ type: core.Input }],
        dropZoneClassName: [{ type: core.Input }],
        useDragEnter: [{ type: core.Input }],
        contentClassName: [{ type: core.Input }],
        showBrowseBtn: [{ type: core.Input }],
        browseBtnClassName: [{ type: core.Input }],
        browseBtnLabel: [{ type: core.Input }],
        onFileDrop: [{ type: core.Output }],
        onFileOver: [{ type: core.Output }],
        onFileLeave: [{ type: core.Output }],
        contentTemplate: [{ type: core.ContentChild, args: [NgxFileDropContentTemplateDirective, { read: core.TemplateRef },] }],
        fileSelector: [{ type: core.ViewChild, args: ['fileSelector', { static: true },] }],
        disabled: [{ type: core.Input }]
    };

    var NgxFileDropModule = /** @class */ (function () {
        function NgxFileDropModule() {
        }
        return NgxFileDropModule;
    }());
    NgxFileDropModule.decorators = [
        { type: core.NgModule, args: [{
                    declarations: [
                        NgxFileDropComponent,
                        NgxFileDropContentTemplateDirective,
                    ],
                    imports: [
                        common.CommonModule
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

    exports.NgxFileDropComponent = NgxFileDropComponent;
    exports.NgxFileDropContentTemplateDirective = NgxFileDropContentTemplateDirective;
    exports.NgxFileDropEntry = NgxFileDropEntry;
    exports.NgxFileDropModule = NgxFileDropModule;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngx-file-drop.umd.js.map
