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

import { goals } from "@atomist/sdm";
import {
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import { Build } from "@atomist/sdm-pack-build";
import {
    TravisCi,
    usesUsupportedFeatures,
} from "./travisScanner";

/**
 * When we see a complex Travis file that we cannot emulate,
 * set an external build goal to invoke Travis.
 */
export class DelegateToTravisBuildInterpreter implements Interpreter {

    private readonly build: Build = new Build({
        displayName: "Travis Build",
    }).with({
        externalTool: "travis",
    });

    public async enrich(interpretation: Interpretation): Promise<boolean> {
        if (!interpretation.reason.analysis.elements.travis) {
            return false;
        }
        const travis = interpretation.reason.analysis.elements.travis as TravisCi;
        if (!interpretation.buildGoals || usesUsupportedFeatures(travis)) {
            // !isSatisfied(interpretation.reason.analysis.elements.travis, interpretation)) {
            // TODO undo previous one? Requirements
            interpretation.buildGoals =
                goals("build").plan(this.build).after(interpretation.checkGoals);
            delete interpretation.testGoals;
            return true;
        }
        return false;
    }

    /** Satisfies everything from Travis */
    public readonly paths: string[] = ["travis"];
}
