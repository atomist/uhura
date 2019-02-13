/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger } from "@atomist/automation-client";
import {
    Services,
    TechnologyScanner,
    TechnologyStack,
} from "@atomist/sdm-pack-analysis";
import * as yaml from "yamljs";

/**
 * Represents what we know about Travis CI from the travis.yml file
 */
export interface TravisCi extends TechnologyStack {

    language: string;

    name: "travis";

    beforeInstall: string[];

    afterSuccess: string[];

    scripts: string[];

    /**
     * This is for browser testing
     */
    addons: any | undefined;

    env: BoundEnvironmentVariables;

    /**
     * Can we emulate this build? Useful in querying.
     */
    canEmulate?: boolean;

}

/**
 * Do we use unsupported features of Travis CI
 * @param {TravisCi} travis
 * @return {boolean}
 */
export function usesUsupportedFeatures(travis: TravisCi): boolean {
    if (!!travis.addons) {
        // We can't emulate Travis addons, at least for now
        return true;
    }
    return false;
}

export type BoundEnvironmentVariables = Record<string, string>;

/**
 * Scan for Travis information
 */
export const travisScanner: TechnologyScanner<TravisCi> = async p => {
    const travisYaml = await p.getFile(".travis.yml");
    if (!travisYaml) {
        return undefined;
    }

    try {
        const nativeObject = tryAsYamlThenJson(await travisYaml.getContent());

        const env: BoundEnvironmentVariables = {};
        for (const e of nativeObject.env || []) {
            // Format is DB=postgres
            const key = e.substring(0, e.indexOf("="));
            let value = e.substring(key.length + 1);
            if (value.startsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            env[key] = value;
        }

        const services: Services = {};
        // Services can be a single value or list
        if (typeof nativeObject.services === "string") {
            services[nativeObject.services] = {};
        } else {
            for (const e of nativeObject.services || []) {
                services[e] = {};
            }
        }
        const travis: TravisCi = {
            name: "travis",
            projectName: p.name,
            language: nativeObject.language,
            scripts: nativeObject.script || [],
            env,
            addons: nativeObject.addons,
            beforeInstall: nativeObject.before_install ?
                [nativeObject.before_install] :
                [],
            afterSuccess: nativeObject.after_success ?
                [nativeObject.after_success] :
                [],
            services,
            referencedEnvironmentVariables: [],
            tags: ["travis"],
        };
        travis.canEmulate = !usesUsupportedFeatures(travis);
        return travis;
    } catch (e) {
        logger.warn("Cannot parse YAML file: %s", e.message);
        return undefined;
    }
};

/**
 * First try to parse as YAML then try as JSON (yes, this is legal!)
 * @param {string} content
 * @return {TravisCi}
 */
function tryAsYamlThenJson(content: string): any {
    try {
        return yaml.parse(content);
    } catch (error) {
        return JSON.parse(content);
    }
}
