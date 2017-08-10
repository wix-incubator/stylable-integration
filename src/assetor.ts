import { FSResolver } from "./fs-resolver";
import { dirname } from 'path';



const ensureDir = (dir:string,fs:any) => {
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


export function ensureAssets(projectAssetsMap:{[key:string]:string},fs:any,rootPath:string){
    Object.keys(projectAssetsMap).map((assetOriginalPath)=>{
        if(fs.existsSync(assetOriginalPath)){
            const content = fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath]//.replace(rootPath,process.cwd());
            const targetDir = dirname(targetPath);
            ensureDir(targetDir,fs);
            fs.writeFileSync(targetPath,content);
        }
    })
}
