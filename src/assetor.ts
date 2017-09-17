import { dirname } from 'path';
import { fsLike } from './types';

export function ensureDirectory (dir:string,fs:fsLike) {
    if (dir === '.' || fs.existsSync(dir)) { return; }

    try {
        fs.mkdirSync(dir);
    } catch (e) {
        const parentDir = dirname(dir);
        if (parentDir !== dir) {
            ensureDirectory(parentDir, fs);
            fs.mkdirSync(dir);
        }
    }
}

export function ensureAssets(projectAssetsMap:{[key:string]:string}, fs:fsLike){
    Object.keys(projectAssetsMap).map((assetOriginalPath)=>{
        if(fs.existsSync(assetOriginalPath)){
            const content = fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath];
            const targetDir = dirname(targetPath);
            ensureDirectory(targetDir,fs);
            fs.writeFileSync(targetPath,content);
        }
    })
}


//TODO: remove usage in favor of css-loader
const relativeImportAsset = /url\s*\(\s*["']?([^:]*?)["']?\s*\)/gm;
export function getUsedAssets(source: string): string[] {
    const splitSource = source.split(relativeImportAsset);
    const res: string[] = [];
    splitSource.forEach((chunk, idx) => {
        if (idx % 2) {
            res.push(chunk);
        }
    })
    return res;
}
