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
    configurationValue,
    GitProject,
    logger,
} from "@atomist/automation-client";
import {
    execPromise,
    fetchGoalsForCommit,
    goal,
    Goal,
    goals,
    SdmGoalEvent,
    SdmGoalState,
    ServiceRegistration,
    ServiceRegistrationGoalDataKey,
    updateGoal,
} from "@atomist/sdm";
import { loadKubeConfig } from "@atomist/sdm-core/lib/pack/k8s/config";
import {
    K8sServiceRegistrationType,
    K8sServiceSpec,
} from "@atomist/sdm-core/lib/pack/k8s/service";
import { formatDuration } from "@atomist/sdm-core/lib/util/misc/time";
import {
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import {
    KubernetesApplication,
    KubernetesDeploy,
} from "@atomist/sdm-pack-k8s";
import { getKubernetesGoalEventData } from "@atomist/sdm-pack-k8s/lib/deploy/data";
import { appExternalUrls } from "@atomist/sdm-pack-k8s/lib/deploy/externalUrls";
import { deleteApplication } from "@atomist/sdm-pack-k8s/lib/kubernetes/application";
import { errMsg } from "@atomist/sdm-pack-k8s/lib/support/error";
import { codeLine } from "@atomist/slack-messages";
import * as k8s from "@kubernetes/client-node";
import * as _ from "lodash";
import * as randomWord from "random-word";
import { DeepPartial } from "ts-essentials";
import { Mongo } from "../mongo/spec";
import { K8sStack } from "./k8sScanner";

export class K8sDeployInterpreter implements Interpreter {

    private readonly testDeploy: Goal = new KubernetesDeploy(
        {
            environment: "uhura",
            preApproval: true,
        })
        .withService(Mongo)
        .with({
            applicationData: applicationDataCallback,
        });

    private readonly verifyTestDeploy: Goal = goal({
        environment: "testing",
        uniqueName: "verify uhura deploy",
        displayName: "verify `uhura` deploy",
        descriptions: {
            completed: "Verified `uhura` deploy",
            inProcess: "Verifying `uhura` deploy",
        },
        isolate: true,
        preCondition: {
            retries: 60,
            timeoutSeconds: 10,
            condition: async gi => {
                const { goalEvent, context, id, progressLog } = gi;
                let appData;
                if (!getKubernetesGoalEventData(goalEvent)) {
                    const gs = await fetchGoalsForCommit(context, id, goalEvent.repo.providerId, goalEvent.goalSetId);
                    const deployGoal = gs.find(g => g.uniqueName === this.testDeploy.uniqueName);
                    appData = getKubernetesGoalEventData(deployGoal);

                    await updateGoal(gi.context, gi.goalEvent, {
                        state: SdmGoalState.in_process,
                        description:
                            `Verifying ${codeLine(`uhura:${getNamespace(context.workspaceId)}/${goalEvent.repo.name}`)}`,
                    });

                } else {
                    appData = getKubernetesGoalEventData(goalEvent);
                }

                try {
                    const result = await execPromise("dig", [appData.host, "+trace"]);
                    const resolved = result.stdout && result.stdout.includes(appData.host + ".");
                    progressLog.write(
                        `Checking dns resolution for host '${appData.host}': ${resolved ? "successfully resolved" : "not resolved"}`);
                    return resolved;
                } catch (e) {
                    progressLog.write(`Checking dns resolution for host '${appData.host}': ${e.message}`);
                }
                return false;
            },
        },
    }).with({
        name: "verify-test-deploy",
        goalExecutor: async gi => {
            const { goalEvent, context, id } = gi;
            let appData;
            if (!getKubernetesGoalEventData(goalEvent)) {
                const gs = await fetchGoalsForCommit(context, id, goalEvent.repo.providerId, goalEvent.goalSetId);
                const deployGoal = gs.find(g => g.uniqueName === this.testDeploy.uniqueName);
                appData = getKubernetesGoalEventData(deployGoal);
            } else {
                appData = getKubernetesGoalEventData(goalEvent);
            }

            return {
                code: 0,
                description: `Verified ${codeLine(`uhura:${getNamespace(context.workspaceId)}/${goalEvent.repo.name}`)}`,
                externalUrls: await appExternalUrls(appData, goalEvent),
            };
        },
    });

    private readonly stopTestDeploy: Goal = goal({
        environment: "testing",
        uniqueName: "stop uhura deploy",
        displayName: "stop `uhura` deploy",
        descriptions: {
            completed: "Stopped `uhura` deploy",
            inProcess: "Stopping `uhura` deploy",
        },
        isolate: true,
        preCondition: {
            retries: 20,
            timeoutSeconds: 60,
            condition: async gi => {
                const { goalEvent, context } = gi;
                const timeout = 10; // mins
                const stopTs = gi.goalEvent.ts + (1000 * 60 * timeout);
                if (stopTs <= Date.now()) {
                    return true;
                } else {

                    await updateGoal(gi.context, gi.goalEvent, {
                        state: SdmGoalState.in_process,
                        description:
                            `Stopping ${codeLine(`uhura:${getNamespace(context.workspaceId)}/${goalEvent.repo.name}`)}`,
                        phase: `in ${formatDuration(stopTs - Date.now(), "m[m]")}`,
                    });

                    return false;
                }
            },
        },
    })
        .with({
            name: "stop-test-deploy",
            goalExecutor: async gi => {
                const { progressLog, goalEvent, context, configuration } = gi;
                progressLog.write(`Stopping test deployment`);
                const kc = loadKubeConfig();
                const apps = kc.makeApiClient(k8s.Apps_v1Api);

                try {
                    const ns = getNamespace(context.workspaceId);
                    const selector = `atomist.com/goal-set-id=${goalEvent.goalSetId}`;
                    const deployments = (await apps.listNamespacedDeployment(
                        ns,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        selector))
                        .body.items.filter(d => d.metadata.name === goalEvent.repo.name);

                    logger.debug(`The following deployments were found in k8s: '${
                        deployments.map(d => `${d.metadata.namespace}:${d.metadata.name}`).join(", ")}'`);

                    for (const deployment of deployments) {
                        await deleteApplication(
                            {
                                name: deployment.metadata.name,
                                ns: deployment.metadata.namespace,
                                workspaceId: context.workspaceId,
                            });
                    }
                } catch (e) {
                    progressLog.write(`Failed to delete test deployment: ${errMsg(e)}`);
                    logger.warn(`Failed to delete test deployment`, e);
                    return {
                        code: 1,
                    };
                }
                return {
                    code: 0,
                    state: SdmGoalState.success,
                    description:
                        `Stopped ${codeLine(`uhura:${getNamespace(context.workspaceId)}/${goalEvent.repo.name}`)}`,
                };
            },
        })
        .withService(k8sServiceAccount("sdm-restricted"));

    public async enrich(interpretation: Interpretation): Promise<boolean> {
        const k8sStack = interpretation.reason.analysis.elements.k8s as K8sStack;
        if (!k8sStack) {
            return false;
        }

        interpretation.deployGoals = goals("test deploy")
            .plan(this.testDeploy)
            .plan(this.verifyTestDeploy, this.stopTestDeploy).after(this.testDeploy);

        return true;
    }
}

export async function applicationDataCallback(app: KubernetesApplication,
                                              p: GitProject,
                                              g: KubernetesDeploy,
                                              goalEvent: SdmGoalEvent): Promise<KubernetesApplication> {
    app.name = p.name;
    app.host = `${randomWord().toLowerCase()}-${randomWord().toLowerCase()}-${app.workspaceId.toLowerCase()}.g.atomist.com`;
    app.path = "/";
    app.ns = getNamespace(app.workspaceId);
    app.imagePullSecret = "sdm-imagepullsecret";

    const deploymentSpec: DeepPartial<k8s.V1Deployment> = {
        metadata: {
            labels: {
                "atomist.com/goal-set-id": goalEvent.goalSetId,
                "atomist.com/goal-id": (goalEvent as any).id,
                "atomist.com/sdm-purpose": "application",
            },
        },
        spec: {
            template: {
                spec: {
                    containers: [{}],
                },
            },
        },
    };

    if (!!goalEvent.data) {
        let data: any = {};
        try {
            data = JSON.parse(goalEvent.data);
        } catch (e) {
            logger.warn(`Failed to parse goal data on '${goalEvent.uniqueName}'`);
        }
        if (!!data[ServiceRegistrationGoalDataKey]) {
            _.forEach(data[ServiceRegistrationGoalDataKey], (v, k) => {
                logger.debug(
                    `Service with name '${k}' and type '${v.type}' found for goal '${goalEvent.uniqueName}'`);
                if (v.type === K8sServiceRegistrationType.K8sService) {
                    const spec = v.spec as K8sServiceSpec;
                    if (!!spec.container) {
                        if (Array.isArray(spec.container)) {
                            deploymentSpec.spec.template.spec.containers.push(...spec.container);
                        } else {
                            deploymentSpec.spec.template.spec.containers.push(spec.container);
                        }
                    }
                }
            });
        }
    }

    app.deploymentSpec = _.merge(app.deploymentSpec || {}, deploymentSpec);

    const ingressSpec: DeepPartial<k8s.V1beta1Ingress> = {
        metadata: {
            annotations: {
                "kubernetes.io/ingress.class": "nginx",
                "nginx.ingress.kubernetes.io/client-body-buffer-size": "1m",
            },
        },
    };

    app.ingressSpec = _.merge(app.ingressSpec || {}, ingressSpec);

    delete app.serviceAccountSpec;
    delete app.roleBindingSpec;
    delete app.roleSpec;

    return app;
}

function getNamespace(workspaceId: string): string {
    const ns = configurationValue<string>("environment", "sdm");
    if (ns.includes("testing")) {
        return `sdm-testing-${workspaceId.toLowerCase()}`;
    } else {
        return `sdm-${workspaceId.toLowerCase()}`;
    }
}

interface K8sServiceAccountServiceSpec {
    name: string;
}

enum K8sServiceAccountRegistrationType {
    K8sServiceAccount = "@atomist/sdm-pack-global/service/k8s",
}

function k8sServiceAccount(name: string): ServiceRegistration<K8sServiceAccountServiceSpec> {
    return {
        name: "k8s-service-account",
        service: async () => {
            return {
                type: K8sServiceAccountRegistrationType.K8sServiceAccount,
                spec: {
                    name,
                },
            };
        },
    };
}
