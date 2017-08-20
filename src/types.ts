import * as fs from 'fs';

export interface fsLike {
    readFileSync:typeof fs.readFileSync;
    readFile:typeof fs.readFile;
    stat:typeof fs.stat;
    statSync:typeof fs.statSync;
    readdir:typeof fs.readdir;
    readdirSync:typeof fs.readdirSync;
    readlink:typeof fs.readlink;
    existsSync:typeof fs.existsSync;
    writeFileSync:typeof fs.writeFileSync;
    mkdirSync:typeof fs.mkdirSync;
}
