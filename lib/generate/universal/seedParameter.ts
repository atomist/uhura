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
    BaseParameter,
} from "@atomist/automation-client";
import * as gitUrlParse from "git-url-parse";
import { SelectedRepo } from "../../common/SelectedRepoFinder";

/**
 * Allow the user to input the seed URL in free text
 */
export const FreeTextSeedUrlParameterDefinition: BaseParameter = {
    description: "URL of seed repo",
    validInput: "GitHub URL, such as https://github.com/myorg/myrepo",
    pattern: /(git@|https?:\/\/)[^:\/]+[:\/][^\s^\.]+/,
};

/**
 * Build parameters from a static list
 */
export function dropDownSeedUrlParameterDefinition(...seeds: SelectedRepo[]): BaseParameter {
    return {
        required: true,
        type: {
            kind: "single",
            options: seeds.map(seed => {
                const gu = gitUrlParse(seed.url);
                return {
                    value: seed.url,
                    description: `${shorten(seed.description, 72)}: ${gu.owner}/${gu.name}`,
                };
            }),
        },
    };
}

function shorten(s: string, max: number): string {
    if (s.length <= max) {
        return s;
    }
    return s.slice(0, max - 3) + "...";
}
