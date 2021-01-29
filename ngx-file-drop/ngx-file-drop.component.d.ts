import { ElementRef, EventEmitter, NgZone, OnDestroy, Renderer2, TemplateRef } from '@angular/core';
import { NgxFileDropEntry } from './ngx-file-drop-entry';
export declare class NgxFileDropComponent implements OnDestroy {
    private zone;
    private renderer;
    accept: string;
    directory: boolean;
    multiple: boolean;
    dropZoneLabel: string;
    dropZoneClassName: string;
    useDragEnter: boolean;
    contentClassName: string;
    showBrowseBtn: boolean;
    browseBtnClassName: string;
    browseBtnLabel: string;
    onFileDrop: EventEmitter<NgxFileDropEntry[]>;
    onFileOver: EventEmitter<any>;
    onFileLeave: EventEmitter<any>;
    contentTemplate: TemplateRef<any>;
    fileSelector: ElementRef;
    isDraggingOverDropZone: boolean;
    private globalDraggingInProgress;
    private readonly globalDragStartListener;
    private readonly globalDragEndListener;
    private files;
    private numOfActiveReadEntries;
    private helperFormEl;
    private fileInputPlaceholderEl;
    private dropEventTimerSubscription;
    private _disabled;
    get disabled(): boolean;
    set disabled(value: boolean);
    constructor(zone: NgZone, renderer: Renderer2);
    ngOnDestroy(): void;
    onDragOver(event: Event): void;
    onDragEnter(event: Event): void;
    onDragLeave(event: Event): void;
    dropFiles(event: DragEvent): void;
    openFileSelector: (event?: MouseEvent) => void;
    /**
     * Processes the change event of the file input and adds the given files.
     * @param Event event
     */
    uploadFiles(event: Event): void;
    private checkFiles;
    private traverseFileTree;
    /**
     * Clears any added files from the file input element so the same file can subsequently be added multiple times.
     */
    private resetFileInput;
    /**
     * Get a cached HTML form element as a helper element to clear the file input element.
     */
    private getHelperFormElement;
    /**
     * Get a cached HTML div element to be used as placeholder for the file input element when clearing said element.
     */
    private getFileInputPlaceholderElement;
    private canGetAsEntry;
    private isDropzoneDisabled;
    private addToQueue;
    private preventAndStop;
}
