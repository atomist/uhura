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
    CodeTransform,
    SdmContext,
} from "@atomist/sdm";

export interface SelectedRepo {

    url: string;
    description: string;

    transform?: CodeTransform;
}

/**
 * Find repos of interest
 */
export type SelectedRepoFinder = (ctx: SdmContext) => Promise<SelectedRepo[]>;

/**
 * Enable the combination of multiple repo finders
 */
export interface SelectedRepoSource {
    seedFinder: SelectedRepoFinder;
    description: string;
}
