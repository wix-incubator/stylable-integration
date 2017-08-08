export interface StylableIntegrationOptions{
    defaultPrefix: string
    assetsDir:string,
    assetsServerUri:string,
    injectBundleCss:boolean,
    injectFileCss:boolean,
    nsDelimiter:string
}


export const StylableIntegrationDefaults:StylableIntegrationOptions = {
    defaultPrefix:'s',
    assetsDir:'assets',
    assetsServerUri:'//assets',
    injectBundleCss:false,
    injectFileCss:false,
    nsDelimiter:'💠'
}
