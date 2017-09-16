import MemoryFileSystem = require('memory-fs');

export function memoryFS() {

    const mfs: MemoryFileSystem = new MemoryFileSystem();
    const lastModified: { [k: string]: Date } = {};

    // memory-fs doens't support stats by default, so we wrap all relevant methods
    // to make it work.
    wrap('writeFileSync', writeFile)
    wrap('unlinkSync', unlink)
    wrap('rmdirSync', rmdir)
    wrap('statSync', stat)
    wrap('mkdir', mkdir)

    function mkdir(fn: Function, args: any[]) {
        // mfs doesn't support supplying the mode!
        if (typeof args[2] === 'function') {
            return fn.apply(mfs, [args[0], args[2]])
        } else {
            return fn.apply(mfs, args)
        }
    }

    function writeFile(fn: Function, args: any[]) {
        const filePath = args[0]
        const result = fn.apply(mfs, args)
        lastModified[filePath] = new Date()
        return result
    }

    function unlink(fn: Function, args: any[]) {
        const filePath = args[0]
        const result = fn.apply(mfs, args)
        delete lastModified[filePath]
        return result
    }

    function rmdir(fn: Function, args: any[]) {
        const dir = args[0]
        const result = fn.apply(mfs, args)
        Object.keys(lastModified).reduce<any>((memo, filePath) => {
            var mtime = lastModified[filePath];
            if (filePath.indexOf(dir) !== 0) {
                memo[filePath] = mtime
            }
            return memo
        }, {});
        return result
    }

    function stat(fn: Function, args: any[]) {
        const filePath = args[0]
        const stats = fn.apply(mfs, args)
        stats.mtime = lastModified[filePath]
        return stats
    }

    function wrap(method: keyof MemoryFileSystem, fn: Function) {
        const oldFn = mfs[method]
        mfs[method] = function () {
            return fn(oldFn, arguments);
        }
    }

    return mfs;
}
