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

import { Options } from "@atomist/automation-client/lib/metadata/automationMetadata";
import {
    CodeTransform,
    GeneratorRegistration,
} from "@atomist/sdm";
import {
    NodeProjectCreationParameters,
    NodeProjectCreationParametersDefinition,
    UpdatePackageJsonIdentification,
    UpdateReadmeTitle,
} from "@atomist/sdm-pack-node";
import { codeLine } from "@atomist/slack-messages";
import { SelectedRepo } from "../../common/SelectedRepoFinder";
import { SdmEnablementTransform } from "../support/sdmEnablement";
import {
    OptionalSeedParamsDefinitions,
    SeedDrivenCommandConfig,
    SeedDrivenCommandParams,
    toRepoRef,
} from "./SeedDrivenCommandParams";

export interface UniversalNodeGeneratorParams extends NodeProjectCreationParameters,
    SeedDrivenCommandParams {
}

/**
 * Generator that can work against any Node seed, using a dynamic starting point
 * and configurable seed selection. Always asks for the standard set of
 * Node parameters, so does not require dynamic parameters.
 */
export function universalNodeGenerator(
    config: SeedDrivenCommandConfig,
    seeds: SelectedRepo[] = []): GeneratorRegistration<UniversalNodeGeneratorParams> {
    return {
        ...config,
        parameters: {
            ...NodeProjectCreationParametersDefinition,
            ...OptionalSeedParamsDefinitions,
            seedUrl: config.seedParameter,
        },
        startingPoint: pi => {
            // Verify that only allowed seed urls are provided
            if (!!config.seedParameter.type && (config.seedParameter.type as Options).kind === "single" ) {
                const options = (config.seedParameter.type as Options).options;
                if (!options.some(o => o.value === pi.parameters.seedUrl)) {
                    throw new Error(`Provided seed url ${codeLine(pi.parameters.seedUrl)} is not in the list if available seeds.`);
                }
            }
            return toRepoRef(pi.parameters);
        },
        transform: [
            UpdateReadmeTitle,
            UpdatePackageJsonIdentification,
            // Run the special transform that is registered on the seed
            async (p, papi, params) => {
                const seed = seeds.filter(s => !!s.transform).find(s => s.url === papi.parameters.seedUrl);
                if (!!seed) {
                    return seed.transform(p, papi, params);
                }
                return p;
            },
            addProvenanceFile,
            SdmEnablementTransform,
        ],
    };
}

/**
 * Add a provenance file to the repo
 */
export const addProvenanceFile: CodeTransform<UniversalNodeGeneratorParams> =
    async (p, pi) => {
        await p.addFile(
            ".provenance",
            `This project was created by Atomist from seed project ${pi.parameters.seedUrl}\n\n` +
            `\tPackage JSON was transformed\n`);
    };
