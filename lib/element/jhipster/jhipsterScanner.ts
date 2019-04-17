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
import * as _ from "lodash";

export interface JHipsterStack extends TechnologyElement {
    name: "jhipster";
    version: string;
}

export class JHipsterScanner implements PhasedTechnologyScanner<JHipsterStack> {

    public async classify(p: FastProject, ctx: SdmContext): Promise<TechnologyClassification | undefined> {
        return undefined;
    }

    get scan(): TechnologyScanner<JHipsterStack> {
        return async p => {
            const yoRcFile = await p.getFile(".yo-rc.json");

            if (!yoRcFile) {
                return undefined;
            }

            const parsedYeomanRc = JSON.parse(await yoRcFile.getContent());
            if (_.get(parsedYeomanRc, "generator-jhipster")) {
                const stack: JHipsterStack = {
                    tags: ["jhipster"],
                    name: "jhipster",
                    version: _.get(parsedYeomanRc, "generator-jhipster.jhipsterVersion"),
                };
                return stack;
            } else {
                return undefined;
            }
        };
    }
}
