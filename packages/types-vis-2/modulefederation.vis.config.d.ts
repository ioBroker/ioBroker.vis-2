/**
 * Admin shares these modules for all components
 *
 * @param packageJson - package.json or list of modules that used in component
 * @returns Object with shared modules for "federation"
 */
export declare function moduleFederationShared(packageJson?: Record<string, any> | string[]): {
    [packageName: string]: {
        requiredVersion: '*';
        singleton: true;
    };
};
