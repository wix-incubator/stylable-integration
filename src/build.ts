import { transformStylableCSS, getUsedAssets } from "./stylable-transform";
import { NewResolver } from "./fs-resolver";
import { dirname, join, resolve } from "path";
import { fsLike } from "./types";
import { StylableIntegrationDefaults } from "./options";
import { ensureAssets, ensureDirectory } from "./assetor";

export interface BuildOptions {
    extension: string;
    fs: fsLike;
    resolver: NewResolver;
    rootDir: string;
    srcDir: string;
    outDir: string;
    log?: (...args: string[]) => void;
}

export function build(buildOptions: BuildOptions) {
    const {extension, fs, resolver, rootDir, srcDir, outDir, log} = buildOptions;

    const fullSrcDir = join(rootDir, srcDir);
    let projectAssets: string[] = [];
    const diagnosticsMsg: string[] = [];
    const filesToBuild = findFilesRecursive(fs, fullSrcDir, extension);
    const projectAssetMapping: { [key: string]: string } = {};
    filesToBuild.forEach(filePath => {
        const outSrcPath = join(rootDir, outDir, filePath.replace(fullSrcDir, ''));
        const outPath = outSrcPath + '.js';
        log && log('[Build]', filePath + ' --> ' + outPath);
        const content = tryRun(() => fs.readFileSync(filePath).toString(), 'Read File Error');
        const fileDirectory = dirname(filePath);
        const outDirPath = dirname(outPath);
        const { code, sheet } = tryRun(() => transformStylableCSS(content, filePath, resolver, { ...StylableIntegrationDefaults, injectFileCss: true }), 'Transform Error');
        if(log && sheet.diagnostics.reports.length){
            diagnosticsMsg.push(`Errors in file: ${filePath}`);
            sheet.diagnostics.reports.forEach((report)=>{
                const err = report.node.error(report.message, report.options);
                diagnosticsMsg.push([
                    report.message,
                    err.showSourceCode()
                ].join('\n'))
            });
        }
        const hasDir = fs.existsSync(outDirPath);
        if (!hasDir) {
            tryRun(() => ensureDirectory(outDirPath, fs), 'Ensure directory');
        }
        tryRun(() => fs.writeFileSync(outSrcPath, content), 'Write File Error');
        tryRun(() => fs.writeFileSync(outPath, code), 'Write File Error');
        projectAssets = projectAssets.concat(getUsedAssets(content).map((uri: string) => resolve(fileDirectory, uri)));
    });

    if(log && diagnosticsMsg.length){
        log('[Diagnostics]\n', diagnosticsMsg.join('\n\n'));
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