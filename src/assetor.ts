import { dirname } from 'path';
import { fsLike } from "./types";

const ensureDir = (dir:string,fs:fsLike) => {
  // This will create a dir given a path such as './folder/subfolder'
  const splitPath = dir.split('\\');
  splitPath.reduce((path, subPath) => {
    let currentPath;
    if(subPath != '.'){
      currentPath = path ? path + '\\' + subPath : subPath;
      if (!fs.existsSync(currentPath)){
        fs.mkdirSync(currentPath);
      }
    }
    else{
      currentPath = subPath;
    }
    return currentPath
  }, '')
}

export function ensureAssets(projectAssetsMap:{[key:string]:string}, fs:fsLike){
    Object.keys(projectAssetsMap).map((assetOriginalPath)=>{
        if(fs.existsSync(assetOriginalPath)){
            const content = fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath];
            const targetDir = dirname(targetPath);
            ensureDir(targetDir,fs);
            fs.writeFileSync(targetPath,content);
        }
    })
}
