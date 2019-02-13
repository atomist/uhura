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

import { GitHubRepoRef } from "@atomist/automation-client";
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
import * as gitUrlParse from "git-url-parse";
import { SdmEnablementTransform } from "../support/sdmEnablement";
import {
    SeedDrivenCommandConfig,
    SeedDrivenCommandParams,
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
    config: SeedDrivenCommandConfig): GeneratorRegistration<UniversalNodeGeneratorParams> {
    return {
        ...config,
        parameters: {
            ...NodeProjectCreationParametersDefinition,
            seedUrl: config.seedParameter,
        },
        startingPoint: pi => {
            const gitUrl = gitUrlParse(pi.parameters.seedUrl);
            return GitHubRepoRef.from({ owner: gitUrl.owner, repo: gitUrl.name });
        },
        transform: [
            UpdateReadmeTitle,
            UpdatePackageJsonIdentification,
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
