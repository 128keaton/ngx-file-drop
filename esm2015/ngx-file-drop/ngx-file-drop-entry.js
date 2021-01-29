/**
 * fileEntry is an instance of {@link FileSystemFileEntry} or {@link FileSystemDirectoryEntry}.
 * Which one is it can be checked using {@link FileSystemEntry.isFile} or {@link FileSystemEntry.isDirectory}
 * properties of the given {@link FileSystemEntry}.
 */
export class NgxFileDropEntry {
    constructor(relativePath, fileEntry) {
        this.relativePath = relativePath;
        this.fileEntry = fileEntry;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LWZpbGUtZHJvcC1lbnRyeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9uZ3gtZmlsZS1kcm9wL25neC1maWxlLWRyb3AtZW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUE7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxnQkFBZ0I7SUFDekIsWUFDVyxZQUFvQixFQUNwQixTQUEwQjtRQUQxQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixjQUFTLEdBQVQsU0FBUyxDQUFpQjtJQUVyQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBGaWxlU3lzdGVtRW50cnksIEZpbGVTeXN0ZW1GaWxlRW50cnksIEZpbGVTeXN0ZW1EaXJlY3RvcnlFbnRyeSB9IGZyb20gJy4vZG9tLnR5cGVzJztcblxuLyoqXG4gKiBmaWxlRW50cnkgaXMgYW4gaW5zdGFuY2Ugb2Yge0BsaW5rIEZpbGVTeXN0ZW1GaWxlRW50cnl9IG9yIHtAbGluayBGaWxlU3lzdGVtRGlyZWN0b3J5RW50cnl9LlxuICogV2hpY2ggb25lIGlzIGl0IGNhbiBiZSBjaGVja2VkIHVzaW5nIHtAbGluayBGaWxlU3lzdGVtRW50cnkuaXNGaWxlfSBvciB7QGxpbmsgRmlsZVN5c3RlbUVudHJ5LmlzRGlyZWN0b3J5fVxuICogcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4ge0BsaW5rIEZpbGVTeXN0ZW1FbnRyeX0uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ3hGaWxlRHJvcEVudHJ5IHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHVibGljIHJlbGF0aXZlUGF0aDogc3RyaW5nLFxuICAgICAgICBwdWJsaWMgZmlsZUVudHJ5OiBGaWxlU3lzdGVtRW50cnlcbiAgICApIHtcbiAgICB9XG59XG4iXX0=