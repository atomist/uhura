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

import { CodeTransform } from "@atomist/sdm";
import { toggleSdmEnablement } from "../../preference/commands";

/**
 * Invoke as a transform in a generator to enable SDM.
 */
export const SdmEnablementTransform: CodeTransform =
    async (p, papi) => {
        // Automatically enable project for this SDM
        await toggleSdmEnablement({ owner: p.id.owner, repo: p.id.repo }, true, papi);
        return p;
    };
