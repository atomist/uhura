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

import { projectUtils } from "@atomist/automation-client";
import {
    TechnologyElement,
    TechnologyScanner,
} from "@atomist/sdm-pack-analysis";

export interface DockerStack extends TechnologyElement {
    name: "docker";
}

export const dockerScanner: TechnologyScanner<DockerStack> = async p => {
    let dockerfile: string;
    await projectUtils.doWithFiles(p, "**/Dockerfile", f => {
        dockerfile = f.path;
    });

    if (!dockerfile) {
        return undefined;
    }

    const stack: DockerStack = {
        tags: ["docker"],
        name: "docker",
    };
    return stack;
};
