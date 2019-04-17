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

import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { StackSupport } from "@atomist/sdm-pack-analysis";
import { DotnetCoreInterpreter } from "./DotnetCoreInterpreter";
import { dotnetCoreScanner } from "./dotnetCoreScanner";
import { DotnetCoreTransformRecipeContributor } from "./dotnetCoreTransforms";

/**
 * StackSupport for .NET Core
 */
export function dotnetCoreStack(sdm: SoftwareDeliveryMachine): StackSupport {
    return {
        scanners: [dotnetCoreScanner],
        interpreters: [new DotnetCoreInterpreter()],
        transformRecipeContributors: [{
            originator: "dotnetcore",
            optional: false,
            contributor: new DotnetCoreTransformRecipeContributor(),
        }],
    };
}
