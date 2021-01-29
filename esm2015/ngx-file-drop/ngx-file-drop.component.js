import { Component, ContentChild, EventEmitter, Input, NgZone, Output, Renderer2, TemplateRef, ViewChild } from '@angular/core';
import { timer } from 'rxjs';
import { NgxFileDropEntry } from './ngx-file-drop-entry';
import { NgxFileDropContentTemplateDirective } from './ngx-templates.directive';
export class NgxFileDropComponent {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LWZpbGUtZHJvcC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbmd4LWZpbGUtZHJvcC9uZ3gtZmlsZS1kcm9wLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFlBQVksRUFFWixZQUFZLEVBQ1osS0FBSyxFQUNMLE1BQU0sRUFFTixNQUFNLEVBQ04sU0FBUyxFQUNULFdBQVcsRUFDWCxTQUFTLEVBQ1YsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFnQixLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFM0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFekQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFPaEYsTUFBTSxPQUFPLG9CQUFvQjtJQXNFL0IsWUFDVSxJQUFZLEVBQ1osUUFBbUI7UUFEbkIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLGFBQVEsR0FBUixRQUFRLENBQVc7UUFyRXRCLFdBQU0sR0FBVyxHQUFHLENBQUM7UUFHckIsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUczQixhQUFRLEdBQVksSUFBSSxDQUFDO1FBR3pCLGtCQUFhLEdBQVcsRUFBRSxDQUFDO1FBRzNCLHNCQUFpQixHQUFXLDBCQUEwQixDQUFDO1FBR3ZELGlCQUFZLEdBQVksS0FBSyxDQUFDO1FBRzlCLHFCQUFnQixHQUFXLHdCQUF3QixDQUFDO1FBR3BELGtCQUFhLEdBQVksS0FBSyxDQUFDO1FBRy9CLHVCQUFrQixHQUFXLGtEQUFrRCxDQUFDO1FBR2hGLG1CQUFjLEdBQVcsY0FBYyxDQUFDO1FBR3hDLGVBQVUsR0FBcUMsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUdsRSxlQUFVLEdBQXNCLElBQUksWUFBWSxFQUFFLENBQUM7UUFHbkQsZ0JBQVcsR0FBc0IsSUFBSSxZQUFZLEVBQUUsQ0FBQztR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QXNCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFtQixDQUFDO1NBQ3BGO1FBRUQsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUM7SUFDckMsQ0FBQztJQUVPLGFBQWEsQ0FBQyxJQUFTO1FBQzdCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUNqQyxDQUFDO0lBRU8sa0JBQWtCO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTyxVQUFVLENBQUMsSUFBc0I7UUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFZO1FBQ2pDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN4QixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDekIsQ0FBQzs7O1lBaFVGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsZUFBZTtnQkFDekIsbTFDQUE2Qzs7YUFFOUM7OztZQWpCQyxNQUFNO1lBR04sU0FBUzs7O3FCQWlCUixLQUFLO3dCQUdMLEtBQUs7dUJBR0wsS0FBSzs0QkFHTCxLQUFLO2dDQUdMLEtBQUs7MkJBR0wsS0FBSzsrQkFHTCxLQUFLOzRCQUdMLEtBQUs7aUNBR0wsS0FBSzs2QkFHTCxLQUFLO3lCQUdMLE1BQU07eUJBR04sTUFBTTswQkFHTixNQUFNOzhCQUlOLFlBQVksU0FBQyxtQ0FBbUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUU7MkJBRXZFLFNBQVMsU0FBQyxjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO3VCQXFCMUMsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCxcbiAgQ29udGVudENoaWxkLFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgT3V0cHV0LFxuICBSZW5kZXJlcjIsXG4gIFRlbXBsYXRlUmVmLFxuICBWaWV3Q2hpbGRcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIHRpbWVyIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7IE5neEZpbGVEcm9wRW50cnkgfSBmcm9tICcuL25neC1maWxlLWRyb3AtZW50cnknO1xuaW1wb3J0IHsgRmlsZVN5c3RlbURpcmVjdG9yeUVudHJ5LCBGaWxlU3lzdGVtRW50cnksIEZpbGVTeXN0ZW1GaWxlRW50cnkgfSBmcm9tICcuL2RvbS50eXBlcyc7XG5pbXBvcnQgeyBOZ3hGaWxlRHJvcENvbnRlbnRUZW1wbGF0ZURpcmVjdGl2ZSB9IGZyb20gJy4vbmd4LXRlbXBsYXRlcy5kaXJlY3RpdmUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICduZ3gtZmlsZS1kcm9wJyxcbiAgdGVtcGxhdGVVcmw6ICcuL25neC1maWxlLWRyb3AuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9uZ3gtZmlsZS1kcm9wLmNvbXBvbmVudC5zY3NzJ10sXG59KVxuZXhwb3J0IGNsYXNzIE5neEZpbGVEcm9wQ29tcG9uZW50IGltcGxlbWVudHMgT25EZXN0cm95IHtcblxuICBASW5wdXQoKVxuICBwdWJsaWMgYWNjZXB0OiBzdHJpbmcgPSAnKic7XG5cbiAgQElucHV0KClcbiAgcHVibGljIGRpcmVjdG9yeTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpXG4gIHB1YmxpYyBtdWx0aXBsZTogYm9vbGVhbiA9IHRydWU7XG5cbiAgQElucHV0KClcbiAgcHVibGljIGRyb3Bab25lTGFiZWw6IHN0cmluZyA9ICcnO1xuXG4gIEBJbnB1dCgpXG4gIHB1YmxpYyBkcm9wWm9uZUNsYXNzTmFtZTogc3RyaW5nID0gJ25neC1maWxlLWRyb3BfX2Ryb3Atem9uZSc7XG5cbiAgQElucHV0KClcbiAgcHVibGljIHVzZURyYWdFbnRlcjogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpXG4gIHB1YmxpYyBjb250ZW50Q2xhc3NOYW1lOiBzdHJpbmcgPSAnbmd4LWZpbGUtZHJvcF9fY29udGVudCc7XG5cbiAgQElucHV0KClcbiAgcHVibGljIHNob3dCcm93c2VCdG46IGJvb2xlYW4gPSBmYWxzZTtcblxuICBASW5wdXQoKVxuICBwdWJsaWMgYnJvd3NlQnRuQ2xhc3NOYW1lOiBzdHJpbmcgPSAnYnRuIGJ0bi1wcmltYXJ5IGJ0bi14cyBuZ3gtZmlsZS1kcm9wX19icm93c2UtYnRuJztcblxuICBASW5wdXQoKVxuICBwdWJsaWMgYnJvd3NlQnRuTGFiZWw6IHN0cmluZyA9ICdCcm93c2UgZmlsZXMnO1xuXG4gIEBPdXRwdXQoKVxuICBwdWJsaWMgb25GaWxlRHJvcDogRXZlbnRFbWl0dGVyPE5neEZpbGVEcm9wRW50cnlbXT4gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgQE91dHB1dCgpXG4gIHB1YmxpYyBvbkZpbGVPdmVyOiBFdmVudEVtaXR0ZXI8YW55PiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBAT3V0cHV0KClcbiAgcHVibGljIG9uRmlsZUxlYXZlOiBFdmVudEVtaXR0ZXI8YW55PiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAvLyBjdXN0b20gdGVtcGxhdGVzXG4gIEBDb250ZW50Q2hpbGQoTmd4RmlsZURyb3BDb250ZW50VGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgY29udGVudFRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuXG4gIEBWaWV3Q2hpbGQoJ2ZpbGVTZWxlY3RvcicsIHsgc3RhdGljOiB0cnVlIH0pXG4gIHB1YmxpYyBmaWxlU2VsZWN0b3I6IEVsZW1lbnRSZWY7XG5cbiAgcHVibGljIGlzRHJhZ2dpbmdPdmVyRHJvcFpvbmU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwcml2YXRlIGdsb2JhbERyYWdnaW5nSW5Qcm9ncmVzczogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHJlYWRvbmx5IGdsb2JhbERyYWdTdGFydExpc3RlbmVyOiAoKSA9PiB2b2lkO1xuICBwcml2YXRlIHJlYWRvbmx5IGdsb2JhbERyYWdFbmRMaXN0ZW5lcjogKCkgPT4gdm9pZDtcblxuICBwcml2YXRlIGZpbGVzOiBOZ3hGaWxlRHJvcEVudHJ5W10gPSBbXTtcbiAgcHJpdmF0ZSBudW1PZkFjdGl2ZVJlYWRFbnRyaWVzOiBudW1iZXIgPSAwO1xuXG4gIHByaXZhdGUgaGVscGVyRm9ybUVsOiBIVE1MRm9ybUVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaWxlSW5wdXRQbGFjZWhvbGRlckVsOiBIVE1MRGl2RWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgZHJvcEV2ZW50VGltZXJTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbiB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgX2Rpc2FibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHVibGljIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuX2Rpc2FibGVkOyB9XG5cbiAgQElucHV0KClcbiAgcHVibGljIHNldCBkaXNhYmxlZCh2YWx1ZTogYm9vbGVhbikge1xuICAgIHRoaXMuX2Rpc2FibGVkID0gKHZhbHVlICE9IG51bGwgJiYgYCR7dmFsdWV9YCAhPT0gJ2ZhbHNlJyk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHpvbmU6IE5nWm9uZSxcbiAgICBwcml2YXRlIHJlbmRlcmVyOiBSZW5kZXJlcjJcbiAgKSB7XG4gICAgdGhpcy5nbG9iYWxEcmFnU3RhcnRMaXN0ZW5lciA9IHRoaXMucmVuZGVyZXIubGlzdGVuKCdkb2N1bWVudCcsICdkcmFnc3RhcnQnLCAoZXZ0OiBFdmVudCkgPT4ge1xuICAgICAgdGhpcy5nbG9iYWxEcmFnZ2luZ0luUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuZ2xvYmFsRHJhZ0VuZExpc3RlbmVyID0gdGhpcy5yZW5kZXJlci5saXN0ZW4oJ2RvY3VtZW50JywgJ2RyYWdlbmQnLCAoZXZ0OiBFdmVudCkgPT4ge1xuICAgICAgdGhpcy5nbG9iYWxEcmFnZ2luZ0luUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kcm9wRXZlbnRUaW1lclN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5kcm9wRXZlbnRUaW1lclN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5kcm9wRXZlbnRUaW1lclN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZ2xvYmFsRHJhZ1N0YXJ0TGlzdGVuZXIoKTtcbiAgICB0aGlzLmdsb2JhbERyYWdFbmRMaXN0ZW5lcigpO1xuICAgIHRoaXMuZmlsZXMgPSBbXTtcbiAgICB0aGlzLmhlbHBlckZvcm1FbCA9IG51bGw7XG4gICAgdGhpcy5maWxlSW5wdXRQbGFjZWhvbGRlckVsID0gbnVsbDtcbiAgfVxuXG4gIHB1YmxpYyBvbkRyYWdPdmVyKGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnVzZURyYWdFbnRlcikge1xuICAgICAgdGhpcy5wcmV2ZW50QW5kU3RvcChldmVudCk7XG4gICAgfSBlbHNlIGlmICghdGhpcy5pc0Ryb3B6b25lRGlzYWJsZWQoKSAmJiAhdGhpcy51c2VEcmFnRW50ZXIpIHtcbiAgICAgIGlmICghdGhpcy5pc0RyYWdnaW5nT3ZlckRyb3Bab25lKSB7XG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZ092ZXJEcm9wWm9uZSA9IHRydWU7XG4gICAgICAgIHRoaXMub25GaWxlT3Zlci5lbWl0KGV2ZW50KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHJldmVudEFuZFN0b3AoZXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvbkRyYWdFbnRlcihldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcm9wem9uZURpc2FibGVkKCkgJiYgdGhpcy51c2VEcmFnRW50ZXIpIHtcbiAgICAgIGlmICghdGhpcy5pc0RyYWdnaW5nT3ZlckRyb3Bab25lKSB7XG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZ092ZXJEcm9wWm9uZSA9IHRydWU7XG4gICAgICAgIHRoaXMub25GaWxlT3Zlci5lbWl0KGV2ZW50KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHJldmVudEFuZFN0b3AoZXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvbkRyYWdMZWF2ZShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcm9wem9uZURpc2FibGVkKCkpIHtcbiAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmdPdmVyRHJvcFpvbmUpIHtcbiAgICAgICAgdGhpcy5pc0RyYWdnaW5nT3ZlckRyb3Bab25lID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25GaWxlTGVhdmUuZW1pdChldmVudCk7XG4gICAgICB9XG4gICAgICB0aGlzLnByZXZlbnRBbmRTdG9wKGV2ZW50KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZHJvcEZpbGVzKGV2ZW50OiBEcmFnRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcm9wem9uZURpc2FibGVkKCkpIHtcbiAgICAgIHRoaXMuaXNEcmFnZ2luZ092ZXJEcm9wWm9uZSA9IGZhbHNlO1xuICAgICAgaWYgKGV2ZW50LmRhdGFUcmFuc2Zlcikge1xuICAgICAgICBldmVudC5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdjb3B5JztcbiAgICAgICAgbGV0IGl0ZW1zOiBGaWxlTGlzdCB8IERhdGFUcmFuc2Zlckl0ZW1MaXN0O1xuICAgICAgICBpZiAoZXZlbnQuZGF0YVRyYW5zZmVyLml0ZW1zKSB7XG4gICAgICAgICAgaXRlbXMgPSBldmVudC5kYXRhVHJhbnNmZXIuaXRlbXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbXMgPSBldmVudC5kYXRhVHJhbnNmZXIuZmlsZXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2ZW50QW5kU3RvcChldmVudCk7XG4gICAgICAgIHRoaXMuY2hlY2tGaWxlcyhpdGVtcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG9wZW5GaWxlU2VsZWN0b3IgPSAoZXZlbnQ/OiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgaWYgKHRoaXMuZmlsZVNlbGVjdG9yICYmIHRoaXMuZmlsZVNlbGVjdG9yLm5hdGl2ZUVsZW1lbnQpIHtcbiAgICAgICh0aGlzLmZpbGVTZWxlY3Rvci5uYXRpdmVFbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNsaWNrKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgZmlsZSBpbnB1dCBhbmQgYWRkcyB0aGUgZ2l2ZW4gZmlsZXMuXG4gICAqIEBwYXJhbSBFdmVudCBldmVudFxuICAgKi9cbiAgcHVibGljIHVwbG9hZEZpbGVzKGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc0Ryb3B6b25lRGlzYWJsZWQoKSkge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IChldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXMgfHwgKFtdIGFzIGFueSk7XG4gICAgICAgIHRoaXMuY2hlY2tGaWxlcyhpdGVtcyk7XG4gICAgICAgIHRoaXMucmVzZXRGaWxlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrRmlsZXMoaXRlbXM6IEZpbGVMaXN0IHwgRGF0YVRyYW5zZmVySXRlbUxpc3QpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbaV07XG4gICAgICBsZXQgZW50cnk6IEZpbGVTeXN0ZW1FbnRyeSB8IG51bGwgPSBudWxsO1xuICAgICAgaWYgKHRoaXMuY2FuR2V0QXNFbnRyeShpdGVtKSkge1xuICAgICAgICBlbnRyeSA9IGl0ZW0ud2Via2l0R2V0QXNFbnRyeSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWVudHJ5KSB7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgY29uc3QgZmFrZUZpbGVFbnRyeTogRmlsZVN5c3RlbUZpbGVFbnRyeSA9IHtcbiAgICAgICAgICAgIG5hbWU6IChpdGVtIGFzIEZpbGUpLm5hbWUsXG4gICAgICAgICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gICAgICAgICAgICBpc0ZpbGU6IHRydWUsXG4gICAgICAgICAgICBmaWxlOiAoY2FsbGJhY2s6IChmaWxlYTogRmlsZSkgPT4gdm9pZCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICBjYWxsYmFjayhpdGVtIGFzIEZpbGUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGNvbnN0IHRvVXBsb2FkOiBOZ3hGaWxlRHJvcEVudHJ5ID0gbmV3IE5neEZpbGVEcm9wRW50cnkoZmFrZUZpbGVFbnRyeS5uYW1lLCBmYWtlRmlsZUVudHJ5KTtcbiAgICAgICAgICB0aGlzLmFkZFRvUXVldWUodG9VcGxvYWQpO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChlbnRyeS5pc0ZpbGUpIHtcbiAgICAgICAgICBjb25zdCB0b1VwbG9hZDogTmd4RmlsZURyb3BFbnRyeSA9IG5ldyBOZ3hGaWxlRHJvcEVudHJ5KGVudHJ5Lm5hbWUsIGVudHJ5KTtcbiAgICAgICAgICB0aGlzLmFkZFRvUXVldWUodG9VcGxvYWQpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgICB0aGlzLnRyYXZlcnNlRmlsZVRyZWUoZW50cnksIGVudHJ5Lm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZHJvcEV2ZW50VGltZXJTdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuZHJvcEV2ZW50VGltZXJTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gICAgdGhpcy5kcm9wRXZlbnRUaW1lclN1YnNjcmlwdGlvbiA9IHRpbWVyKDIwMCwgMjAwKVxuICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmZpbGVzLmxlbmd0aCA+IDAgJiYgdGhpcy5udW1PZkFjdGl2ZVJlYWRFbnRyaWVzID09PSAwKSB7XG4gICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmZpbGVzO1xuICAgICAgICAgIHRoaXMuZmlsZXMgPSBbXTtcbiAgICAgICAgICB0aGlzLm9uRmlsZURyb3AuZW1pdChmaWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmF2ZXJzZUZpbGVUcmVlKGl0ZW06IEZpbGVTeXN0ZW1FbnRyeSwgcGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKGl0ZW0uaXNGaWxlKSB7XG4gICAgICBjb25zdCB0b1VwbG9hZDogTmd4RmlsZURyb3BFbnRyeSA9IG5ldyBOZ3hGaWxlRHJvcEVudHJ5KHBhdGgsIGl0ZW0pO1xuICAgICAgdGhpcy5maWxlcy5wdXNoKHRvVXBsb2FkKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoID0gcGF0aCArICcvJztcbiAgICAgIGNvbnN0IGRpclJlYWRlciA9IChpdGVtIGFzIEZpbGVTeXN0ZW1EaXJlY3RvcnlFbnRyeSkuY3JlYXRlUmVhZGVyKCk7XG4gICAgICBsZXQgZW50cmllczogRmlsZVN5c3RlbUVudHJ5W10gPSBbXTtcblxuICAgICAgY29uc3QgcmVhZEVudHJpZXMgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMubnVtT2ZBY3RpdmVSZWFkRW50cmllcysrO1xuICAgICAgICBkaXJSZWFkZXIucmVhZEVudHJpZXMoKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gYWRkIGVtcHR5IGZvbGRlcnNcbiAgICAgICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICBjb25zdCB0b1VwbG9hZDogTmd4RmlsZURyb3BFbnRyeSA9IG5ldyBOZ3hGaWxlRHJvcEVudHJ5KHBhdGgsIGl0ZW0pO1xuICAgICAgICAgICAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFRvUXVldWUodG9VcGxvYWQpO1xuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnRyYXZlcnNlRmlsZVRyZWUoZW50cmllc1tpXSwgcGF0aCArIGVudHJpZXNbaV0ubmFtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBjb250aW51ZSB3aXRoIHRoZSByZWFkaW5nXG4gICAgICAgICAgICBlbnRyaWVzID0gZW50cmllcy5jb25jYXQocmVzdWx0KTtcbiAgICAgICAgICAgIHJlYWRFbnRyaWVzKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5udW1PZkFjdGl2ZVJlYWRFbnRyaWVzLS07XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgcmVhZEVudHJpZXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIGFueSBhZGRlZCBmaWxlcyBmcm9tIHRoZSBmaWxlIGlucHV0IGVsZW1lbnQgc28gdGhlIHNhbWUgZmlsZSBjYW4gc3Vic2VxdWVudGx5IGJlIGFkZGVkIG11bHRpcGxlIHRpbWVzLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNldEZpbGVJbnB1dCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5maWxlU2VsZWN0b3IgJiYgdGhpcy5maWxlU2VsZWN0b3IubmF0aXZlRWxlbWVudCkge1xuICAgICAgY29uc3QgZmlsZUlucHV0RWwgPSB0aGlzLmZpbGVTZWxlY3Rvci5uYXRpdmVFbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBjb25zdCBmaWxlSW5wdXRDb250YWluZXJFbCA9IGZpbGVJbnB1dEVsLnBhcmVudEVsZW1lbnQ7XG4gICAgICBjb25zdCBoZWxwZXJGb3JtRWwgPSB0aGlzLmdldEhlbHBlckZvcm1FbGVtZW50KCk7XG4gICAgICBjb25zdCBmaWxlSW5wdXRQbGFjZWhvbGRlckVsID0gdGhpcy5nZXRGaWxlSW5wdXRQbGFjZWhvbGRlckVsZW1lbnQoKTtcblxuICAgICAgLy8gSnVzdCBhIHF1aWNrIGNoZWNrIHNvIHdlIGRvIG5vdCBtZXNzIHVwIHRoZSBET00gKHdpbGwgbmV2ZXIgaGFwcGVuIHRob3VnaCkuXG4gICAgICBpZiAoZmlsZUlucHV0Q29udGFpbmVyRWwgIT09IGhlbHBlckZvcm1FbCkge1xuICAgICAgICAvLyBJbnNlcnQgdGhlIGZvcm0gaW5wdXQgcGxhY2Vob2xkZXIgaW4gdGhlIERPTSBiZWZvcmUgdGhlIGZvcm0gaW5wdXQgZWxlbWVudC5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5pbnNlcnRCZWZvcmUoZmlsZUlucHV0Q29udGFpbmVyRWwsIGZpbGVJbnB1dFBsYWNlaG9sZGVyRWwsIGZpbGVJbnB1dEVsKTtcbiAgICAgICAgLy8gQWRkIHRoZSBmb3JtIGlucHV0IGFzIGNoaWxkIG9mIHRoZSB0ZW1wb3JhcnkgZm9ybSBlbGVtZW50LCByZW1vdmluZyB0aGUgZm9ybSBpbnB1dCBmcm9tIHRoZSBET00uXG4gICAgICAgIHRoaXMucmVuZGVyZXIuYXBwZW5kQ2hpbGQoaGVscGVyRm9ybUVsLCBmaWxlSW5wdXRFbCk7XG4gICAgICAgIC8vIFJlc2V0IHRoZSBmb3JtLCB0aHVzIGNsZWFyaW5nIHRoZSBpbnB1dCBlbGVtZW50IG9mIGFueSBmaWxlcy5cbiAgICAgICAgaGVscGVyRm9ybUVsLnJlc2V0KCk7XG4gICAgICAgIC8vIEFkZCB0aGUgZmlsZSBpbnB1dCBiYWNrIHRvIHRoZSBET00gaW4gcGxhY2Ugb2YgdGhlIGZpbGUgaW5wdXQgcGxhY2Vob2xkZXIgZWxlbWVudC5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5pbnNlcnRCZWZvcmUoZmlsZUlucHV0Q29udGFpbmVyRWwsIGZpbGVJbnB1dEVsLCBmaWxlSW5wdXRQbGFjZWhvbGRlckVsKTtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBpbnB1dCBwbGFjZWhvbGRlciBmcm9tIHRoZSBET01cbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDaGlsZChmaWxlSW5wdXRDb250YWluZXJFbCwgZmlsZUlucHV0UGxhY2Vob2xkZXJFbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNhY2hlZCBIVE1MIGZvcm0gZWxlbWVudCBhcyBhIGhlbHBlciBlbGVtZW50IHRvIGNsZWFyIHRoZSBmaWxlIGlucHV0IGVsZW1lbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEhlbHBlckZvcm1FbGVtZW50KCk6IEhUTUxGb3JtRWxlbWVudCB7XG4gICAgaWYgKCF0aGlzLmhlbHBlckZvcm1FbCkge1xuICAgICAgdGhpcy5oZWxwZXJGb3JtRWwgPSB0aGlzLnJlbmRlcmVyLmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuaGVscGVyRm9ybUVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNhY2hlZCBIVE1MIGRpdiBlbGVtZW50IHRvIGJlIHVzZWQgYXMgcGxhY2Vob2xkZXIgZm9yIHRoZSBmaWxlIGlucHV0IGVsZW1lbnQgd2hlbiBjbGVhcmluZyBzYWlkIGVsZW1lbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEZpbGVJbnB1dFBsYWNlaG9sZGVyRWxlbWVudCgpOiBIVE1MRGl2RWxlbWVudCB7XG4gICAgaWYgKCF0aGlzLmZpbGVJbnB1dFBsYWNlaG9sZGVyRWwpIHtcbiAgICAgIHRoaXMuZmlsZUlucHV0UGxhY2Vob2xkZXJFbCA9IHRoaXMucmVuZGVyZXIuY3JlYXRlRWxlbWVudCgnZGl2JykgYXMgSFRNTERpdkVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmlsZUlucHV0UGxhY2Vob2xkZXJFbDtcbiAgfVxuXG4gIHByaXZhdGUgY2FuR2V0QXNFbnRyeShpdGVtOiBhbnkpOiBpdGVtIGlzIERhdGFUcmFuc2Zlckl0ZW0ge1xuICAgIHJldHVybiAhIWl0ZW0ud2Via2l0R2V0QXNFbnRyeTtcbiAgfVxuXG4gIHByaXZhdGUgaXNEcm9wem9uZURpc2FibGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAodGhpcy5nbG9iYWxEcmFnZ2luZ0luUHJvZ3Jlc3MgfHwgdGhpcy5kaXNhYmxlZCk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRvUXVldWUoaXRlbTogTmd4RmlsZURyb3BFbnRyeSk6IHZvaWQge1xuICAgIHRoaXMuZmlsZXMucHVzaChpdGVtKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJldmVudEFuZFN0b3AoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfVxufVxuIl19