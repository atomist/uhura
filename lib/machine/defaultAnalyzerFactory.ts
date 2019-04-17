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
    RunCondition,
    SnipTransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import { nodeStackSupport } from "@atomist/sdm-pack-analysis-node";
import {
    javaStackSupport,
    springBootStackSupport,
} from "@atomist/sdm-pack-analysis-spring";
import { hasAnalysis } from "@atomist/sdm-pack-analysis/lib/analysis/ProjectAnalyzer";
import { singleIssuePerCategoryManaging } from "@atomist/sdm-pack-issue";
import { CodeInspectionInterpreter } from "../element/common/codeInspectionInterpreter";
import { dockerStack } from "../element/docker/dockerStack";
import { dotnetCoreStack } from "../element/dotnet/dotnetCoreStack";
import { jhipsterStack } from "../element/jhipster/jhipsterStack";
import { K8sDeployInterpreter } from "../element/k8s/K8sDeployInterpreter";
import { k8sScanner } from "../element/k8s/k8sScanner";
import { Mongo } from "../element/mongo/spec";
import { EmulateTravisBuildInterpreter } from "../element/travis/EmulateTravisBuildInterpreter";
import { travisScanner } from "../element/travis/travisScanner";
import { AnalyzerFactory } from "./machine";

/**
 * Default analyzer factory with support for Node, Docker and Kubernetes.
 * Add more scanners, interpreters or stacks to extend your SDM's capabilities.
 * @param {SoftwareDeliveryMachine} sdm
 * @return {ProjectAnalyzer}
 */
export const defaultAnalyzerFactory: AnalyzerFactory = sdm => {
    const doNotRunIfJHipster: RunCondition = options => {
        if (hasAnalysis(options)) {
            return !options.analysis.elements.jhipster;
        }
        return true;
    };
    const nodeStack = nodeStackSupport(sdm, {
        configureTestGoal: g => g.withService(Mongo),
    });
    nodeStack.condition = doNotRunIfJHipster;
    const javaStack = javaStackSupport(sdm);
    nodeStack.condition = doNotRunIfJHipster;

    return analyzerBuilder(sdm)
        .withStack(nodeStack)
        .withStack(javaStack)
        .withStack(springBootStackSupport(sdm))
        .withStack(dotnetCoreStack(sdm))
        .withStack(dockerStack(sdm))
        .withStack(jhipsterStack(sdm))

        .withScanner(k8sScanner)
        .withScanner(travisScanner)
        .withScanner(preferencesScanner)

        .withInterpreter(new EmulateTravisBuildInterpreter())
        .withInterpreter(new K8sDeployInterpreter())
        .withInterpreter(new CodeInspectionInterpreter(
            singleIssuePerCategoryManaging(sdm.configuration.name, true, () => true)),
        )

        // Add support for generic seeds...
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
};
