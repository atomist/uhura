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
import {
    HasSpringBootPom,
    SpringBootProjectStructure,
    SpringBootVersionInspection,
} from "@atomist/sdm-pack-spring";

export interface SpringBootStack extends TechnologyStack {

    name: "springboot";

    /**
     * Version of Spring Boot in use
     */
    version: string;

    structure: SpringBootProjectStructure;

    // TODO add starters

}

export const springBootScanner: TechnologyScanner<SpringBootStack> = async p => {
    const isBoot = await HasSpringBootPom.predicate(p);
    if (!isBoot) {
        return undefined;
    }
    const structure = await SpringBootProjectStructure.inferFromJavaOrKotlinSource(p);
    if (!structure) {
        return undefined;
    }
    const versions = await SpringBootVersionInspection(p, undefined);

    const stack: SpringBootStack = {
        // TODO get from Maven POM
        projectName: structure.applicationClass,
        name: "springboot",
        tags: ["spring", "spring-boot"],
        structure,
        version: versions.versions.length > 0 ? versions.versions[0].version : undefined,
        // TODO gather this from properties and YAML
        referencedEnvironmentVariables: [],
    };
    return stack;
};
