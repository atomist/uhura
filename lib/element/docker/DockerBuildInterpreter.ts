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

import { projectUtils } from "@atomist/automation-client";
import {
    goals,
    isMaterialChange,
    LogSuppressor,
} from "@atomist/sdm";
import { K8sServiceRegistration } from "@atomist/sdm-core";
import { K8sServiceRegistrationType } from "@atomist/sdm-core/lib/pack/k8s/service";
import {
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import {
    DockerBuild,
    DockerProgressReporter,
} from "@atomist/sdm-pack-docker";
import * as k8s from "@kubernetes/client-node";
import { DockerStack } from "./dockerScanner";

export class DockerBuildInterpreter implements Interpreter {

    private readonly dockerBuildGoal: DockerBuild = new DockerBuild()
        .with({
            progressReporter: DockerProgressReporter,
            logInterpreter: LogSuppressor,
            options: {
                builder: "kaniko",
                builderArgs: ["--snapshotMode=time", "--single-snapshot"],
                push: false,
                dockerfileFinder: async p => {
                    let dockerfile: string = "Dockerfile";
                    await projectUtils.doWithFiles(p, "**/Dockerfile", async f => {
                        dockerfile = f.path;
                    });
                    return dockerfile;
                },
            },
        });
        // .withService(DockerSocketService);

    public async enrich(interpretation: Interpretation): Promise<boolean> {

        const dockerStack = interpretation.reason.analysis.elements.docker as DockerStack;
        if (!dockerStack) {
            return false;
        }

        interpretation.containerBuildGoals = goals("docker build").plan(this.dockerBuildGoal);

        interpretation.materialChangePushTests.push(isMaterialChange({
            files: ["Dockerfile"],
        }));

        return true;
    }
}

const DockerSocketService: K8sServiceRegistration = {
    name: "docker-sock",
    service: async () => {

        const volume: k8s.V1Volume = {
            name: "docker-sock",
            hostPath: {
                path: "/var/run/docker.sock",
            },
        } as any;

        const volumeMount: k8s.V1VolumeMount = {
            name: "docker-sock",
            mountPath: "/var/run/docker.sock",
        } as any;

        return {
            type: K8sServiceRegistrationType.K8sService,
            spec: {
                volume,
                volumeMount,
            },
        };
    },
};
