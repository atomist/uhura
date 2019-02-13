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

import { Project } from "@atomist/automation-client";
import { SdmContext } from "@atomist/sdm";
import {
    allTechnologyElements,
    ProjectAnalysis,
    TransformRecipe,
    TransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import * as _ from "lodash";

export class ReferencedEnvironmentVariableTransformRecipeContributor implements TransformRecipeContributor {

    public async analyze(p: Project, analysis: ProjectAnalysis, sdmContext: SdmContext): Promise<TransformRecipe | undefined> {
        const allEnv = _.uniq(_.flatten(allTechnologyElements(analysis).map(e => e.referencedEnvironmentVariables)));
        return {
            parameters: [],
            transforms: [],
            messages: allEnv.sort().map(e => `You'll probably need to set environment variable '${e}'`),
        };
    }

}
