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

/**
 * Repo we are interested in, as a seed or for other reasons.
 */
export interface SelectedRepo {

    /**
     * git URL of the repo, such as https://github.com/my-org/my-node-seed
     */
    url: string;

    /**
     * Branch or sha. Handling will be determined by the format
     */
    ref?: string;

    /**
     * Path within the repo. Undefined or "" means the root.
     */
    path?: string;

    description: string;

    /**
     * Transform that should be applied to this repo if it's used as a seed
     */
    transform?: CodeTransform;
}

/**
 * Function that can find repos of interest
 */
export type SelectedRepoFinder = (ctx: SdmContext) => Promise<SelectedRepo[]>;

/**
 * Enable the combination of multiple repo finders
 */
export interface SelectedRepoSource {
    seedFinder: SelectedRepoFinder;
    description: string;
}
