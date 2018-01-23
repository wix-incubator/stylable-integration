import { createCSSModuleString } from "./stylable-transform";
import { TransformHooks, Bundler } from "stylable";
import * as webpack from "webpack";



export interface StylableIntegrationOptions {
    injectBundleCss: boolean;
    nsDelimiter: string;
    filename: string;
    rootScope?: boolean;
    requireModule?: (moduleId: string) => any;
    skipBundle?: boolean;
    createStylableRuntimeModule?: typeof createCSSModuleString;
    transformHooks?: TransformHooks;
    bundleHook?: (compilation: any, chunk: any, bundler: Bundler, files: string[]) => void
}

export const StylableIntegrationDefaults: StylableIntegrationOptions = {
    skipBundle: false,
    rootScope: true,
    injectBundleCss: false,
    nsDelimiter: '💠',
    filename: '[name].css'
}
