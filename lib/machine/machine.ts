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
    AnyPush,
    attachFacts,
    DoNotSetAnyGoalsAndLock,
    ImmaterialGoals,
    not,
    onAnyPush,
    PushTest,
    SoftwareDeliveryMachine,
    StatefulPushListenerInvocation,
    whenPushSatisfies,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
    gitHubGoalStatus,
    goalState,
    SoftwareDeliveryMachineMaker,
} from "@atomist/sdm-core";
import {
    analysis,
    assessInspection,
    buildGoals,
    checkGoals,
    containerGoals,
    controlGoals,
    deployGoals,
    Interpretation,
    materialChange,
    ProjectAnalyzer,
    testGoals,
} from "@atomist/sdm-pack-analysis";
import {
    issueSupport,
    singleIssuePerCategoryManaging,
} from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import {
    CacheScope,
    npmInstallProjectListener,
} from "@atomist/sdm-pack-node";
import { esLintReviewCategory } from "@atomist/sdm-pack-node/lib/inspection/eslint";
import { SelectedRepo } from "../common/SelectedRepoFinder";
import {
    deleteRepo,
    selectRepoToDelete,
} from "../convenience/deleteRepo";
import { publishGitHubTopicsForElements } from "../element/common/publishGitHubTopicsForElements";
import {
    addSeed,
    importSeed,
    listSeeds,
    preferencesSeedSource,
    removeSeed,
} from "../generate/seed-management/seedManagement";
import { selectSeed } from "../generate/seed-management/selectSeed";
import {
    dropDownSeedUrlParameterDefinition,
    FreeTextSeedUrlParameterDefinition,
} from "../generate/universal/seedParameter";
import {
    universalGenerator,
    UniversalGeneratorName,
} from "../generate/universal/universalGenerator";
import { universalNodeGenerator } from "../generate/universal/universalNodeGenerator";
import {
    disableCommand,
    disableGoalCommand,
    disableOrgCommand,
    enableCommand,
    enableGoalCommand,
    enableOrgCommand,
} from "../preference/commands";
import { IsSdmEnabled } from "../preference/pushTests";
import { defaultAnalyzerFactory } from "./defaultAnalyzerFactory";
import { DefaultNodeSeeds } from "./nodeSeeds";

/**
 * Type for creating analyzers
 */
export type AnalyzerFactory = (sdm: SoftwareDeliveryMachine) => ProjectAnalyzer;

export interface CiMachineOptions {
    name: string;
    analyzerFactory: AnalyzerFactory;
    globalSeeds: SelectedRepo[];

    /**
     * Optional push test to limited the types of pushes that should
     * receive our extended goals including build, test, docker build and deploy
     * Defaults to AnyPush meaning running Uhura locally would build, test and deploy
     * each push.
     */
    extendedGoals?: PushTest;
}

const defaultCiMachineOptions: CiMachineOptions = {
    name: "Atomist Uhura",
    analyzerFactory: defaultAnalyzerFactory,
    globalSeeds:  DefaultNodeSeeds,
    extendedGoals: AnyPush,
};

/**
 * Return a function to create a new SoftwareDeliveryMachine based on the
 * given options.
 * @param {Partial<CiMachineOptions>} opts
 * @return {SoftwareDeliveryMachineMaker}
 */
export function machineMaker(opts: Partial<CiMachineOptions> = {}): SoftwareDeliveryMachineMaker {
    const optsToUse: CiMachineOptions = {
        ...defaultCiMachineOptions,
        ...opts,
    };

    return configuration => {
        const sdm = createSoftwareDeliveryMachine({
            name: optsToUse.name,
            configuration,
        });

        const analyzer = optsToUse.analyzerFactory(sdm);

        analyzer.autofixGoal.withProjectListener(npmInstallProjectListener({ scope: CacheScope.Repository }));
        analyzer.codeInspectionGoal
            .withListener(singleIssuePerCategoryManaging(esLintReviewCategory, true, () => true))
            .withProjectListener(npmInstallProjectListener({ scope: CacheScope.Repository }));

        interface Interpreted {
            interpretation: Interpretation;
        }

        sdm.withPushRules(
            whenPushSatisfies(not(IsSdmEnabled)).setGoals(DoNotSetAnyGoalsAndLock),

            attachFacts<Interpreted>(async pu => {
                const interpretation = await analyzer.interpret(pu.project, pu);
                return { interpretation };
            }),

            whenPushSatisfies<StatefulPushListenerInvocation<Interpreted>>(materialChange)
                .itMeans("immaterial change")
                .setGoals(ImmaterialGoals.andLock()),

            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("control")
                .setGoalsWhen(pu => controlGoals(pu.facts.interpretation)),
            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("checks")
                .setGoalsWhen(pu => checkGoals(pu.facts.interpretation, analyzer)),

            // Don't schedule any extended goals
            whenPushSatisfies(not(optsToUse.extendedGoals)).setGoals(DoNotSetAnyGoalsAndLock),

            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("build")
                .setGoalsWhen(pu => buildGoals(pu.facts.interpretation, analyzer)),
            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("test")
                .setGoalsWhen(pu => testGoals(pu.facts.interpretation, analyzer)),
            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("container build")
                .setGoalsWhen(pu => containerGoals(pu.facts.interpretation, analyzer)),
            onAnyPush<StatefulPushListenerInvocation<Interpreted>>()
                .itMeans("deploy")
                .setGoalsWhen(pu => deployGoals(pu.facts.interpretation, analyzer)),
        );

        sdm.addCommand(selectRepoToDelete);
        sdm.addCommand(deleteRepo);

        sdm.addCodeInspectionCommand(assessInspection(analyzer));

        sdm.addGeneratorCommand(importSeed(analyzer));
        sdm.addCommand(addSeed(analyzer));
        sdm.addCommand(removeSeed());
        sdm.addCommand(listSeeds(analyzer));

        // Universal generator, which requires dynamic parameters
        sdm.addGeneratorCommand(universalGenerator(analyzer, {
            name: UniversalGeneratorName,
            intent: `Create ${sdm.configuration.name.replace("@", "")}`,
            description: "create a project from any seed repo, based on analysis",
            seedParameter: FreeTextSeedUrlParameterDefinition,
        }));

        // Create node from a free text input
        sdm.addGeneratorCommand(universalNodeGenerator({
            name: "CreateNode",
            intent: `Create node ${sdm.configuration.name.replace("@", "")}`,
            description: "create a project from any Node seed repo",
            seedParameter: FreeTextSeedUrlParameterDefinition,
        }));

        sdm.addGeneratorCommand(universalNodeGenerator({
            name: "CreateNodeFromList",
            description: "Create a project from a curated list of Node seed repos",
            intent: `discover node ${sdm.configuration.name.replace("@", "")}`,
            seedParameter: dropDownSeedUrlParameterDefinition(...optsToUse.globalSeeds),
        }, optsToUse.globalSeeds));

        sdm.addCommand(selectSeed({
            name: "SelectSeed",
            intent: `select seed`,
            description: "Create a new project, selecting a seed project",
            generatorName: "CreateNode",
            generatorsToShow: 5,
            sources: [preferencesSeedSource, { description: "Global Seeds", seedFinder: async () => optsToUse.globalSeeds }],
        }));

        // Command registrations
        sdm.addCommand(enableCommand(sdm))
            .addCommand(disableCommand(sdm))
            .addCommand(enableOrgCommand(sdm))
            .addCommand(disableOrgCommand(sdm))
            .addCommand(enableGoalCommand(sdm))
            .addCommand(disableGoalCommand(sdm));

        sdm.addFirstPushListener(publishGitHubTopicsForElements(analyzer, sdm));

        // Extension Pack registrations
        sdm.addExtensionPacks(
            analysis(),
            gitHubGoalStatus(),
            goalState(),
            k8sSupport(),
            issueSupport({
                labelIssuesOnDeployment: true,
                closeCodeInspectionIssuesOnBranchDeletion: {
                    enabled: true,
                    source: esLintReviewCategory,
                },
            }),
            /*fingerprintSupport({
                fingerprints: NpmDependencyFingerprint,
                handlers: [
                    checkNpmCoordinatesImpactHandler(),
                    fingerprintImpactHandler(
                        {
                            transformPresentation: (ci, p) => {
                                return new editModes.PullRequest(
                                    `apply-fingerprint-${formatDate()}`,
                                    ci.parameters.title,
                                    ci.parameters.body,
                                    undefined,
                                    p.id.branch,
                                    {
                                        method: editModes.AutoMergeMethod.Merge,
                                        mode: editModes.AutoMergeMode.SuccessfulCheck,
                                    });
                            },
                            messageMaker,
                        },
                    )],
            }),*/
        );

        return sdm;
    };
}
