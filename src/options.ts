export interface StylableIntegrationOptions {
    defaultPrefix: string
    injectBundleCss: boolean,
    injectFileCss: boolean,
    nsDelimiter: string
}

export const StylableIntegrationDefaults: StylableIntegrationOptions = {
    defaultPrefix: 's',
    injectBundleCss: false,
    injectFileCss: false,
    nsDelimiter: '💠'
}
