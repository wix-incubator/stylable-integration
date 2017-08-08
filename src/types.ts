import * as fs from 'fs';


export interface fsLike {
    readFileSync:typeof fs.readFileSync;
    readFile:typeof fs.readFile;
    stat:typeof fs.stat;
    readdir:typeof fs.readdir;
    readlink:typeof fs.readlink;
    existsSync:typeof fs.existsSync;
    writeFileSync:typeof fs.writeFileSync;
    mkdirSync:typeof fs.mkdirSync;
}
