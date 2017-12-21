import { createCSSModuleString } from "./stylable-transform";
import { TransformHooks } from "stylable";



export interface StylableIntegrationOptions {
    injectBundleCss: boolean;
    nsDelimiter: string;
    filename: string;
    rootScope?: boolean;
    requireModule?: (moduleId: string) => any;
    skipBundle?: boolean;
    createStylableRuntimeModule?: typeof createCSSModuleString;
    transformHooks?: TransformHooks;
    
}

export const StylableIntegrationDefaults: StylableIntegrationOptions = {
    skipBundle: false,
    rootScope: true,
    injectBundleCss: false,
    nsDelimiter: '💠',
    filename: '[name].css'
}
