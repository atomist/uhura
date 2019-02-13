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
    TechnologyScanner,
    TechnologyStack,
} from "@atomist/sdm-pack-analysis";

export interface ReactStack extends TechnologyStack {

    name: "react";

    version: string;
}

/**
 * Look for the presence of a react dependency. Extract the version.
 */
export const reactScanner: TechnologyScanner<ReactStack> = async (p, sdmContext, analysisToDate) => {
    const reactDependency = analysisToDate.dependencies.find(d => d.artifact === "react");
    if (!reactDependency) {
        return undefined;
    }

    return {
        name: "react",
        version: reactDependency.version,
        tags: ["react"],
    };
};
