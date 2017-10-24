export interface StylableIntegrationOptions {
    injectBundleCss: boolean;
    nsDelimiter: string;
    filename: string;
    requireModule?: (moduleId: string) => any;
}

export const StylableIntegrationDefaults: StylableIntegrationOptions = {
    injectBundleCss: false,
    nsDelimiter: '💠',
    filename: '[name].css'
}
