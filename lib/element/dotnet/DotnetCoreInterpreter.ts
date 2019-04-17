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
    Project,
    projectUtils,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { microgrammar } from "@atomist/microgrammar";
import {
    ExecuteGoalResult,
    formatDate,
    GoalProjectListenerEvent,
    GoalProjectListenerRegistration,
    goals,
    isMaterialChange,
    LogSuppressor,
    SuccessIsReturn0ErrorFinder,
} from "@atomist/sdm";
import {
    ProjectVersioner,
    readSdmVersion,
    Version,
} from "@atomist/sdm-core";
import {
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import {
    Build,
    Builder,
    spawnBuilder,
} from "@atomist/sdm-pack-build";
import {
    DockerBuild,
    DockerProgressReporter,
} from "@atomist/sdm-pack-docker";
import { getDockerfile } from "../docker/dockerScanner";
import {
    DotnetCoreProjectFileGlob,
    DotnetCoreStack,
} from "./dotnetCoreScanner";

/**
 * Interpreter that adds Version and Build goal for .NET Core apps
 */
export class DotnetCoreInterpreter implements Interpreter {

    private readonly versionGoal: Version = new Version()
        .withVersioner(DotnetCoreProjectVersioner);

    private readonly buildGoal: Build = new Build({
        displayName: "dotnet build",
    }).with({
        logInterpreter: LogSuppressor,
        name: "dotnet-build",
        builder: dotnetCoreBuilder(),
    }).withProjectListener(DotnetCoreVersionProjectListener);

    private readonly dockerBuildGoal: DockerBuild = new DockerBuild()
        .with({
            progressReporter: DockerProgressReporter,
            logInterpreter: LogSuppressor,
            options: {
                dockerfileFinder: getDockerfile,
            },
        });

    public async enrich(interpretation: Interpretation): Promise<boolean> {

        const dotnetCoreStack = interpretation.reason.analysis.elements.dotnetcore as DotnetCoreStack;
        if (!dotnetCoreStack) {
            return false;
        }

        interpretation.buildGoals = goals("build")
            .plan(this.versionGoal)
            .plan(this.buildGoal).after(this.versionGoal);

        if (dotnetCoreStack.hasDockerFile) {
            interpretation.containerBuildGoals = goals("docker build").plan(this.dockerBuildGoal);
        }

        interpretation.materialChangePushTests.push(isMaterialChange({
            extensions: ["csproj", "cs", "cshtml", "json", "html", "css"],
            directories: [".atomist"],
        }));

        return true;
    }
}

/**
 * Builder for running `dotnet build` on a project
 */
export function dotnetCoreBuilder(): Builder {
    return spawnBuilder({
        name: "dotnet build",
        commands: [{ command: "dotnet", args: ["build"] }],
        logInterpreter: LogSuppressor,
        errorFinder: SuccessIsReturn0ErrorFinder,
        projectToAppInfo: async (p: Project) => {
            return {
                id: p.id as RemoteRepoRef,
                name: p.name,
                version: await findVersion(p),
            };
        },
    });
}

/**
 * Calculate project versions for .NET Core projects
 */
export const DotnetCoreProjectVersioner: ProjectVersioner = async (sdmGoal, p) => {
    const branch = sdmGoal.branch.split("/").join(".");
    const branchSuffix = `${branch}.`.replace(/\//g, "-").replace(/_/g, "-");
    const pjVersion = await findVersion(p);

    return `${pjVersion}-${branchSuffix}${formatDate()}`;
};

/**
 * GoalProjectListenerRegistration to inject a SDM version into .NET Core projects
 */
export const DotnetCoreVersionProjectListener: GoalProjectListenerRegistration = {
    name: "dotnet version",
    listener: async (p, r, event): Promise<void | ExecuteGoalResult> => {
        if (GoalProjectListenerEvent.before === event) {
            const sdmGoal = r.goalEvent;
            const version = await readSdmVersion(
                sdmGoal.repo.owner,
                sdmGoal.repo.name,
                sdmGoal.repo.providerId,
                sdmGoal.sha,
                sdmGoal.branch,
                r.context);

            const csprojFiles = await projectUtils.gatherFromFiles(p, DotnetCoreProjectFileGlob, async f => f);
            const csproj = await csprojFiles[0].getContent();
            const oldVersion = await findVersion(p);

            if (!!oldVersion) {
                const newCsproj = csproj.replace(new RegExp(oldVersion, "g"), version);
                await csprojFiles[0].setContent(newCsproj);
            }
        }
    },
};

/**
 * Microgrammar to extract a version string from the .csproj file
 */
export const dotnetCoreVersionGrammar = microgrammar<{ version: string }>({
    // tslint:disable-next-line:no-invalid-template-strings
    phrase: "<Version>${version}</Version>",
    terms: {
        version: /[a-zA-Z_\.0-9\-]+/,
    },
});

const DefaultVersion = "0.0.1";

/**
 * Read version from th .NET Core .csproj files
 */
async function findVersion(p: Project): Promise<string> {
    const csprojFiles = await projectUtils.gatherFromFiles(p, DotnetCoreProjectFileGlob, async f => f);

    if (!csprojFiles || csprojFiles.length === 0) {
        return DefaultVersion;
    }

    const versionMatch = dotnetCoreVersionGrammar.firstMatch(await csprojFiles[0].getContent());
    if (!versionMatch) {
        return DefaultVersion;
    } else {
        return versionMatch.version;
    }
}
