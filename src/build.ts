import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "stylable";
import { dirname, join, resolve, basename, relative } from "path";
import { fsLike } from "./types";
import { ensureAssets, ensureDirectory, getUsedAssets } from "./assetor";

export interface BuildOptions {
    extension: string;
    fs: fsLike;
    stylable: Stylable;
    rootDir: string;
    srcDir: string;
    outDir: string;
    indexFile?: string;
    diagnostics?: (...args: string[]) => void;
    log?: (...args: string[]) => void;
}

export function build(buildOptions: BuildOptions) {
    const { extension, fs, stylable, rootDir, srcDir, outDir, log, diagnostics, indexFile } = buildOptions;

    const fullSrcDir = join(rootDir, srcDir);
    const fullOutDir = join(rootDir, outDir);
    let projectAssets: string[] = [];
    const diagnosticsMsg: string[] = [];
    const filesToBuild = findFilesRecursive(fs, fullSrcDir, extension);
    const projectAssetMapping: { [key: string]: string } = {};
    const indexFileOutput: { from: string, name: string }[] = [];
    const nameMapping: { [key: string]: string } = {};
    filesToBuild.forEach(filePath => {
        if (indexFile) {
            let name = filename2varname(basename(filePath))
            if (nameMapping[name]) {
                throw new Error(`Name Collision Error: ${nameMapping[name]} and ${filePath} has the same filename`);
            }
            log && log('[Build Index]', 'Add file: ' + filePath);
            nameMapping[name] = filePath;
            indexFileOutput.push({
                name,
                from: addDotSlash(relative(fullOutDir, filePath))
            });
        } else {
            const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
            const outPath = outSrcPath + '.js';
            log && log('[Build]', filePath + ' --> ' + outPath);
            const fileDirectory = dirname(filePath);
            const outDirPath = dirname(outPath);
            const hasDir = fs.existsSync(outDirPath);
            if (!hasDir) {
                tryRun(() => ensureDirectory(outDirPath, fs), 'Ensure directory');
            }
            const content = tryRun(() => fs.readFileSync(filePath).toString(), 'Read File Error');
            const res = stylable.transform(content, filePath);
            const { meta } = res;
            const code = tryRun(() => createCSSModuleString(res, { injectFileCss: true }), 'Transform Error');
            if (diagnostics && meta.diagnostics.reports.length) {
                diagnosticsMsg.push(`Errors in file: ${filePath}`);
                meta.diagnostics.reports.forEach((report) => {
                    const err = report.node.error(report.message, report.options);
                    diagnosticsMsg.push([
                        report.message,
                        err.showSourceCode()
                    ].join('\n'))
                });
            }
            tryRun(() => fs.writeFileSync(outSrcPath, content), 'Write File Error');
            tryRun(() => fs.writeFileSync(outPath, code), 'Write File Error');
            projectAssets = projectAssets.concat(getUsedAssets(content).map((uri: string) => resolve(fileDirectory, uri)));
        }

    });

    if (indexFile && indexFileOutput.length) {
        const indexFileContent = indexFileOutput.map((_) => createImportForComponent(_.from, _.name)).join('\n');
        const indexFileTargetPath = join(fullOutDir, indexFile);
        log && log('[Build]', 'creating index file: ' + indexFileTargetPath);
        tryRun(() => fs.writeFileSync(indexFileTargetPath, '\n' + indexFileContent + '\n'), 'Write Index File Error');
    }

    if (diagnostics && diagnosticsMsg.length) {
        diagnostics(diagnosticsMsg.join('\n\n'));
    }

    projectAssets.forEach((originalPath: string) => {
        projectAssetMapping[originalPath] = originalPath.replace(join(rootDir, srcDir), join(rootDir, outDir))
    })

    ensureAssets(projectAssetMapping, fs);
}

const blacklist = new Set<string>(['node_modules']);

function findFilesRecursive(fs: fsLike, rootDirectory: string, ext: string, resultArr: string[] = []) {
    try {
        fs.readdirSync(rootDirectory).forEach(item => {
            if (blacklist.has(item)) { return; }
            const itemFullPath = join(rootDirectory, item);
            try {
                const status = fs.statSync(itemFullPath)
                if (status.isDirectory()) {
                    findFilesRecursive(fs, itemFullPath, ext, resultArr);
                } else if (status.isFile() && itemFullPath.endsWith(ext)) {
                    resultArr.push(itemFullPath);
                }
            } catch (e) { }
        });
    } catch (e) { }
    return resultArr;
}

function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack)
    }
}

function createImportForComponent(from: string, defaultName: string) {
    return [
        `:import {-st-from: ${JSON.stringify(from)};-st-default:${defaultName};}`,
        `${defaultName}{}`
    ].join('\n');
}

function addDotSlash(p: string) {
    p = p.replace(/\\/g, '/');
    return p.charAt(0) === '.' ? p : './' + p;
}

function filename2varname(filename: string) {
    return string2varname(filename.replace(/(?=.*)\.\w+$/, '').replace(/\.st$/, '')).replace(/^[a-z]/, function (x) { return x.toUpperCase() });;
}

function string2varname(str: string) {
    return str
        .replace(/[^0-9a-zA-Z_]/gm, '')
        .replace(/^[^a-zA-Z_]+/gm, '');
}

