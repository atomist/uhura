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
    AutoCodeInspection,
    AutoInspectRegistration,
    ReviewListenerRegistration,
    SdmContext,
} from "@atomist/sdm";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import {
    CodeInspectionRegisteringInterpreter,
    Interpretation,
} from "@atomist/sdm-pack-analysis";

/**
 * Interpreter that configures the internal code inspection  goal
 */
export class CodeInspectionInterpreter implements CodeInspectionRegisteringInterpreter {

    constructor(private readonly listeners: ReviewListenerRegistration | ReviewListenerRegistration[] = []) {
    }

    get codeInspections(): Array<AutoInspectRegistration<any, any>> {
        return [];
    }

    public configureCodeInspectionGoal(codeInspectionGoal: AutoCodeInspection): void {
        toArray(this.listeners).forEach(l => codeInspectionGoal.withListener(l));
    }

    public async enrich(interpretation: Interpretation, sdmContext: SdmContext): Promise<boolean> {
        return false;
    }
}
