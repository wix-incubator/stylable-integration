export interface StylableIntegrationOptions {
    injectBundleCss: boolean;
    injectFileCss: boolean;
    nsDelimiter: string;
    filename: string;
    requireModule?: (moduleId: string) => any;
}

export const StylableIntegrationDefaults: StylableIntegrationOptions = {
    injectBundleCss: false,
    injectFileCss: false,
    nsDelimiter: '💠',
    filename: '[name].css'
}
