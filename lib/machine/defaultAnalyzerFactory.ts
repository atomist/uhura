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
    analyzerBuilder,
    PlaceholderTransformRecipeContributor,
    preferencesScanner,
    SnipTransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import { nodeStackSupport } from "@atomist/sdm-pack-node";
import { springBootScanner } from "@atomist/sdm-pack-spring";
import { DockerBuildInterpreter } from "../element/docker/DockerBuildInterpreter";
import { dockerScanner } from "../element/docker/dockerScanner";
import { K8sDeployInterpreter } from "../element/k8s/K8sDeployInterpreter";
import { k8sScanner } from "../element/k8s/k8sScanner";
import { Mongo } from "../element/mongo/spec";
import { EmulateTravisBuildInterpreter } from "../element/travis/EmulateTravisBuildInterpreter";
import { travisScanner } from "../element/travis/travisScanner";
import { AnalyzerFactory } from "./machine";

/**
 * Default analyzer factory
 * @param {SoftwareDeliveryMachine} sdm
 * @return {ProjectAnalyzer}
 */
export const defaultAnalyzerFactory: AnalyzerFactory = sdm =>
    analyzerBuilder(sdm)
        .withStack(nodeStackSupport({
            configureTestGoal: g => g.withService(Mongo),
        }))
        .withScanner(springBootScanner)
        .withScanner(dockerScanner)
        .withScanner(k8sScanner)
        .withScanner(travisScanner)
        .withScanner(preferencesScanner)
        .withInterpreter(new DockerBuildInterpreter())
        .withInterpreter(new EmulateTravisBuildInterpreter())
        .withInterpreter(new K8sDeployInterpreter())
        .withTransformRecipeContributor({
            contributor: new PlaceholderTransformRecipeContributor(),
            optional: false,
            originator: "placeholders",
        })
        .withTransformRecipeContributor({
            contributor: new SnipTransformRecipeContributor(),
            optional: false,
            originator: "default-snip",
        })
        .build();
