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

import {
    Project,
    projectUtils,
} from "@atomist/automation-client";
import {
    CodeTransform,
    SdmContext,
} from "@atomist/sdm";
import {
    ProjectAnalysis,
    TransformRecipe,
    TransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import { DotnetCoreProjectFileGlob } from "./dotnetCoreScanner";

/**
 * TransformRecipeContributor for .NET Core applications created via universalGenerator
 */
export class DotnetCoreTransformRecipeContributor implements TransformRecipeContributor {

    public async analyze(p: Project, analysis: ProjectAnalysis, sdmContext: SdmContext): Promise<TransformRecipe | undefined> {
        if (!analysis.elements.dotnetcore) {
            return undefined;
        }

        return {
            parameters: [],
            transforms: [DotnetCoreProjectFileCodeTransform],
        };
    }
}

/**
 * CodeTransform to update the name of the .csproj file in the root of the project
 */
export const DotnetCoreProjectFileCodeTransform: CodeTransform = async p => {
    const csprojFiles = await projectUtils.gatherFromFiles(p, DotnetCoreProjectFileGlob, async f => f);
    if (!!csprojFiles && csprojFiles.length === 1) {
        await p.moveFile(csprojFiles[0].path, `${p.name}.csproj`);
    }
    return p;
};
