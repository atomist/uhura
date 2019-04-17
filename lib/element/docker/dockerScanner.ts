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
import { SdmContext } from "@atomist/sdm";
import {
    FastProject,
    TechnologyElement,
    TechnologyScanner,
} from "@atomist/sdm-pack-analysis";
import {
    PhasedTechnologyScanner,
    TechnologyClassification,
} from "@atomist/sdm-pack-analysis/lib/analysis/TechnologyScanner";

export interface DockerStack extends TechnologyElement {
    name: "docker";
}

export class DockerScanner implements PhasedTechnologyScanner<DockerStack> {

    public async classify(p: FastProject, ctx: SdmContext): Promise<TechnologyClassification | undefined> {
        if (!await p.hasFile("Dockerfile")) {
            return {
                name: "docker",
                tags: ["docker"],
                messages: [{ message: "Adding a Dockerfile to this project will trigger a Docker container build." }],
            };
        }
        return undefined;
    }

    get scan(): TechnologyScanner<DockerStack> {
        return async p => {
            const dockerfile = await getDockerfile(p);

            if (!dockerfile) {
                return undefined;
            }

            const stack: DockerStack = {
                tags: ["docker"],
                name: "docker",
            };
            return stack;
        };
    }
}

export async function getDockerfile(p: Project): Promise<string> {
    const dockerfiles = await projectUtils.gatherFromFiles(p, "**/Dockerfile", async f => f);
    if (!!dockerfiles && dockerfiles.length > 0) {
        return dockerfiles[0].path;
    }
    return undefined;
}
