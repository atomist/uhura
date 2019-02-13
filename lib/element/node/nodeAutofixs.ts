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
    isLocalProject,
    logger,
} from "@atomist/automation-client";
import {
    AutofixRegistration,
    spawnPromise,
} from "@atomist/sdm";
import { IsNode } from "@atomist/sdm-pack-node";
import * as path from "path";
import { PackageJson } from "./PackageJson";

export const PackageJsonFormattingAutofix: AutofixRegistration = {
    name: "Package JSON format",
    pushTest: IsNode,
    transform: async p => {
        const pjFile = (await p.getFile("package.json"));
        const pj = JSON.parse(await pjFile.getContent());
        await pjFile.setContent(JSON.stringify(pj, undefined, 2) + "\n");
        return p;
    },
};

export const EslintAutofix: AutofixRegistration = {
    name: "eslint",
    pushTest: IsNode,
    transform: async p => {
        if (!isLocalProject(p)) {
            logger.error(`Project ${p.name} is not a local project`);
            return p;
        }

        const cwd = p.baseDir;

        const pj = await p.getFile("package.json");
        const rawPj: PackageJson = JSON.parse(await pj.getContent()) as PackageJson;

        let files: string[] = ["."];
        if (!!rawPj.scripts && !!rawPj.scripts.lint) {
            files = rawPj.scripts.lint.replace(/"/g, "").split(" ").slice(1);
        }
        const eslintArgs = [
            ...files,
            "--fix",
        ];

        const eslintExe = path.join(cwd, "node_modules", ".bin", "eslint");
        try {
            const eslintResult = await spawnPromise(eslintExe, eslintArgs, { cwd });
            if (eslintResult.stderr) {
                logger.debug(`eslint standard error from ${p.name}: ${eslintResult.stderr}`);
            }
        } catch (e) {
            logger.error(`Failed to run eslint: ${e.message}`);
        }

        return p;
    },
};
