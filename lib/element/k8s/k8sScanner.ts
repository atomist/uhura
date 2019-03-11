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
import { OnPushToAnyBranch } from "@atomist/sdm";
import {
    TechnologyElement,
    TechnologyScanner,
} from "@atomist/sdm-pack-analysis";
import {
    DeploymentMapping,
    getCustomDeploymentMapping,
} from "../../preference/deployment";

export interface K8sStack extends TechnologyElement {
    name: "k8s";
    deploymentMapping: DeploymentMapping;
}

export const k8sScanner: TechnologyScanner<K8sStack> = async (p, ctx) => {
    let dockerfile: string;
    await projectUtils.doWithFiles(p, "**/Dockerfile", f => {
        dockerfile = f.path;
    });

    if (!dockerfile) {
        return undefined;
    }

    if (!(ctx as any).push) {
        return undefined;
    }

    const push: OnPushToAnyBranch.Push = (ctx as any).push;
    if (push.branch === push.repo.defaultBranch) {
        const stack: K8sStack = {
            tags: ["k8s"],
            name: "k8s",
            deploymentMapping: await getCustomDeploymentMapping(ctx),
        };
        return stack;
    }
    return undefined;
};
