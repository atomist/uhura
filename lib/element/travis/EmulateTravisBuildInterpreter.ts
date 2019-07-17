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
    goals,
    pushTest,
    testProgressReporter,
} from "@atomist/sdm";
import {
    Interpretation,
    Interpreter,
    ProjectAnalysis,
} from "@atomist/sdm-pack-analysis";
import {
    Build,
    Builder,
    BuildInProgress,
} from "@atomist/sdm-pack-build";
import {
    nodeBuilder,
    NodeModulesProjectListener,
    NpmProgressTests,
} from "@atomist/sdm-pack-node";
import * as _ from "lodash";
import { BuildEnvironment } from "../common/buildOptions";
import { mongo } from "../mongo/spec";
import {
    TravisCi,
    travisScanner,
    usesUnsupportedFeatures,
} from "./travisScanner";

/**
 * When we see a Travis build file that we can emulate,
 * set a build goal that executes its scripts.
 */
export class EmulateTravisBuildInterpreter implements Interpreter {

    private readonly build: Build = new Build({
        displayName: "Travis emulation build",
        isolate: true,
    }).with({
        name: "travis-emulation",
        pushTest: pushTest("branchCheck", async pu => {
            // TODO analyze project to see if the Travis branch matches
            return true;
        }),
        builder: async (gi, buildNumber) => {
            return gi.configuration.sdm.projectLoader.doWithProject<BuildInProgress>({
                credentials: gi.credentials,
                id: gi.id,
                readOnly: true,
            }, async p => {
                const options = { full: false };
                const emptyAnalysis: ProjectAnalysis = {
                    options,
                    id: gi.id,
                    elements: {},
                    services: {},
                    dependencies: [],
                    referencedEnvironmentVariables: [],
                    fingerprints: [],
                    messages: [],
                };
                // Scan the project for Travis. Push rules should ensure
                // that this is only invoked if there *is* a Travis file
                // and it has scripts
                const travis = await travisScanner(p, gi, emptyAnalysis, options);

                const scripts: string[] = [...travis.scripts, "echo after_success", ...travis.afterSuccess];

                return nodeBuilder(...scripts.map(s => {
                    const elems = s.split(" ");
                    return {
                        command: elems[0],
                        args: elems.slice(1),
                        options: {
                            env: _.merge({}, process.env, travis.env, BuildEnvironment),
                            log: gi.progressLog,
                            cwd: p.baseDir,
                        },
                    };
                }))(gi, buildNumber);
            });
        },
        progressReporter: testProgressReporter(...NpmProgressTests, {
            test: /after_success$/m,
            phase: "Travis: after success",
        }),
    })
        .withProjectListener(NodeModulesProjectListener)
        .withService(mongo());

    public async enrich(interpretation: Interpretation): Promise<boolean> {
        if (!interpretation.reason.analysis.elements.travis) {
            return false;
        }
        if (!!interpretation.buildGoals || !!interpretation.testGoals) {
            return false;
        }

        const travis = interpretation.reason.analysis.elements.travis as TravisCi;

        if (usesUnsupportedFeatures(travis)) {
            // We can't emulate Travis services, at least for now
            return false;
        }

        const buildFunction = resolveBuildFunction(travis);
        if (!buildFunction) {
            // Cannot resolve build function
            return false;
        }

        if (travis.scripts.length > 0) {
            // TODO undo previous one? Requirements
            interpretation.buildGoals =
                goals("build").plan(this.build);
            delete interpretation.testGoals;
            return true;
        } else {
            // throw new Error("Fall back to Travis default scripts for Node language");
        }
        return false;
    }

    /** Satisfies everything from Travis */
    public readonly paths: string[] = ["travis"];
}

/**
 * Resolve build function based on language
 * @param {TravisCi} travis
 */
function resolveBuildFunction(travis: TravisCi): Builder | undefined {
    return nodeBuilder();
}
