import { FSResolver } from "./fs-resolver";
import { dirname } from 'path';
import * as fs from 'fs'


const ensureDir = (dir:string,_fs:typeof fs) => {
  // This will create a dir given a path such as './folder/subfolder'
  const splitPath = dir.split('\\');
  splitPath.reduce((path, subPath) => {
    let currentPath;
    if(subPath != '.'){
      currentPath = path ? path + '\\' + subPath : subPath;
      if (!_fs.existsSync(currentPath)){
        _fs.mkdirSync(currentPath);
      }
    }
    else{
      currentPath = subPath;
    }
    return currentPath
  }, '')
}


export function ensureAssets(projectAssetsMap:{[key:string]:string},_fs:typeof fs,rootPath:string){
    Object.keys(projectAssetsMap).map((assetOriginalPath)=>{
        if(_fs.existsSync(assetOriginalPath)){
            const content = _fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath]//.replace(rootPath,process.cwd());
            const targetDir = dirname(targetPath);
            ensureDir(targetDir,_fs);
            _fs.writeFileSync(targetPath,content);
        }
    })
}
