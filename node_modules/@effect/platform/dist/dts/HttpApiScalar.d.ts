import * as Layer from "effect/Layer";
import { Api } from "./HttpApi.js";
import type * as HttpApi from "./HttpApi.js";
import * as HttpLayerRouter from "./HttpLayerRouter.js";
/**
 * @since 1.0.0
 * @category model
 */
export type ScalarThemeId = "alternate" | "default" | "moon" | "purple" | "solarized" | "bluePlanet" | "deepSpace" | "saturn" | "kepler" | "mars" | "none";
/**
 * @since 1.0.0
 * @category model
 *
 * cdn: `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${source.version}/dist/browser/standalone.min.js`
 */
export type ScalarScriptSource = string | {
    type: "default";
} | {
    type: "cdn";
    version?: "latest" | (string & {});
};
/**
 * @see https://github.com/scalar/scalar/blob/main/documentation/configuration.md
 *
 * @since 1.0.0
 * @category model
 */
export type ScalarConfig = {
    /** A string to use one of the color presets */
    theme?: ScalarThemeId;
    /** The layout to use for the references */
    layout?: "modern" | "classic";
    /** URL to a request proxy for the API client */
    proxy?: string;
    /** Whether the spec input should show */
    isEditable?: boolean;
    /** Whether to show the sidebar */
    showSidebar?: boolean;
    /**
     * Whether to show models in the sidebar, search, and content.
     *
     * Default: `false`
     */
    hideModels?: boolean;
    /**
     * Whether to show the “Download OpenAPI Document” button
     *
     * Default: `false`
     */
    hideDownloadButton?: boolean;
    /**
     * Whether to show the “Test Request” button
     *
     * Default: `false`
     */
    hideTestRequestButton?: boolean;
    /**
     * Whether to show the sidebar search bar
     *
     * Default: `false`
     */
    hideSearch?: boolean;
    /** Whether dark mode is on or off initially (light mode) */
    darkMode?: boolean;
    /** forceDarkModeState makes it always this state no matter what*/
    forceDarkModeState?: "dark" | "light";
    /** Whether to show the dark mode toggle */
    hideDarkModeToggle?: boolean;
    /**
     * Path to a favicon image
     *
     * Default: `undefined`
     * Example: '/favicon.svg'
     */
    favicon?: string;
    /** Custom CSS to be added to the page */
    customCss?: string;
    /**
     * The baseServerURL is used when the spec servers are relative paths and we are using SSR.
     * On the client we can grab the window.location.origin but on the server we need
     * to use this prop.
     *
     * Default: `undefined`
     * Example: 'http://localhost:3000'
     */
    baseServerURL?: string;
    /**
     * We’re using Inter and JetBrains Mono as the default fonts. If you want to use your own fonts, set this to false.
     *
     * Default: `true`
     */
    withDefaultFonts?: boolean;
    /**
     * By default we only open the relevant tag based on the url, however if you want all the tags open by default then set this configuration option :)
     *
     * Default: `false`
     */
    defaultOpenAllTags?: boolean;
};
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options?: {
    readonly path?: `/${string}` | undefined;
    readonly source?: ScalarScriptSource;
    readonly scalar?: ScalarConfig;
}) => Layer.Layer<never, never, Api>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerHttpLayerRouter: (options: {
    readonly api: HttpApi.HttpApi.Any;
    readonly path: `/${string}`;
    readonly source?: ScalarScriptSource;
    readonly scalar?: ScalarConfig;
}) => Layer.Layer<never, never, HttpLayerRouter.HttpRouter>;
//# sourceMappingURL=HttpApiScalar.d.ts.map