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
    PreferenceScope,
    pushTest,
    PushTest,
} from "@atomist/sdm";

export enum EnablementState {
    Enabled = "enabled",
    Disabled = "disabled",
}

/**
 * Push test implementation to test if this SDM is enabled for the current project
 */
export const IsSdmEnabled: PushTest = pushTest(
    "isSdmEnabled",
    async p => {
        const orgEnabled = await p.preferences.get<EnablementState>(
            `${p.id.owner}:enablement_state`,
            { scope: PreferenceScope.Sdm }) === EnablementState.Enabled;
        if (orgEnabled) {
            return true;
        }
        const repoEnabled = await p.preferences.get<EnablementState>(
            `${p.id.owner}/${p.id.repo}:enablement_state`,
            { scope: PreferenceScope.Sdm }) === EnablementState.Enabled;
        return repoEnabled;
    });

/**
 * Is the repo explicitly disabled?
 * @type {PushTest}
 */
export const IsSdmDisabled: PushTest = pushTest(
    "isSdmDisabled",
    async p => {
        const orgDisabled = await p.preferences.get<EnablementState>(
            `${p.id.owner}:enablement_state`,
            { scope: PreferenceScope.Sdm }) === EnablementState.Disabled;
        if (orgDisabled) {
            return true;
        }
        const repoDisabled = await p.preferences.get<EnablementState>(
            `${p.id.owner}/${p.id.repo}:enablement_state`,
            { scope: PreferenceScope.Sdm }) === EnablementState.Disabled;
        return repoDisabled;
    });
