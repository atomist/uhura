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
    GitProject,
    HandlerContext,
    logger,
    QueryNoCacheOptions,
} from "@atomist/automation-client";
import {
    Goal,
    goals,
    OnPushToAnyBranch,
    SdmContext,
    SdmGoalEvent,
} from "@atomist/sdm";
import {
    ElementsGoalsKey,
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import {
    KubernetesApplication,
    KubernetesDeploy,
} from "@atomist/sdm-pack-k8s";
import { ApplicationDataCallback } from "@atomist/sdm-pack-k8s/lib/deploy/goal";
import { validName } from "@atomist/sdm-pack-k8s/lib/kubernetes/name";
import * as slack from "@atomist/slack-messages";
import * as k8s from "@kubernetes/client-node";
import * as _ from "lodash";
import { DeepPartial } from "ts-essentials";
import * as url from "url";
import {
    DockerRegistryProvider,
    KubernetesClusterProvider,
    Password,
} from "../../typings/types";
import { K8sStack } from "./k8sScanner";

export class K8sDeployInterpreter implements Interpreter {

    private readonly testingDeploy: Goal = new KubernetesDeploy(
        {
            environment: "testing",
        })
        .with({
            name: "testing",
            applicationData: applicationDataCallback("testing"),
        });

    private readonly productionDeploy: Goal = new KubernetesDeploy(
        {
            environment: "production",
            preApproval: true,
        })
        .with({
            name: "production",
            applicationData: applicationDataCallback("production"),
        });

    public async enrich(interpretation: Interpretation, ctx: SdmContext): Promise<boolean> {
        const k8sStack = interpretation.reason.analysis.elements.k8s as K8sStack;
        if (!k8sStack) {
            return false;
        }

        if (!!k8sStack.deploymentMapping && !!k8sStack.deploymentMapping.testing) {
            const deployGoals = goals("deploy");
            deployGoals.plan(this.testingDeploy);

            if (!!k8sStack.deploymentMapping.production) {
                deployGoals.plan(this.productionDeploy).after(this.testingDeploy);
            }

            interpretation.deployGoals = deployGoals;
            return true;
        }

        if (!k8sStack.deploymentMapping || (!k8sStack.deploymentMapping.testing && !k8sStack.deploymentMapping.production)) {
            const push: OnPushToAnyBranch.Push = _.get(ctx, "push") || _.get(ctx, "goalEvent.push");
            const slug = slack.bold(`${push.repo.owner}/${push.repo.name}`);
            /*interpretation.messages.push({
                message: `Atomist Uhura allows you to deploy your project ${slug} into your own Kubernetes clusters.

To enable custom deployment, follow the ${slack.url("https://docs.atomist.com/getting-started/", "instructions")}.`,
            });*/
        }

        return false;
    }
}

export function applicationDataCallback(phase: "testing" | "production"): ApplicationDataCallback {
    return async (app: KubernetesApplication,
                  p: GitProject,
                  g: KubernetesDeploy,
                  goalEvent: SdmGoalEvent,
                  ctx: HandlerContext) => {

        if (!!goalEvent.data) {
            let data: any = {};
            try {
                data = JSON.parse(goalEvent.data);
            } catch (e) {
                logger.warn(`Failed to parse goal data on '${goalEvent.uniqueName}'`);
            }
            if (!!data[ElementsGoalsKey] && !!data[ElementsGoalsKey].k8s) {
                const k8sStack = data[ElementsGoalsKey].k8s as K8sStack;

                app.ns = k8sStack.deploymentMapping[phase].ns;
                goalEvent.fulfillment.name = k8sStack.deploymentMapping[phase].cluster;

                if (!app.ingressSpec) {

                    const k8sCluster = await ctx.graphClient.query<KubernetesClusterProvider.Query, KubernetesClusterProvider.Variables>({
                        name: "KubernetesClusterProvider",
                        variables: {
                            name: k8sStack.deploymentMapping[phase].cluster,
                        },
                    });

                    const clusterUrl = _.get(k8sCluster, "KubernetesClusterProvider[0].url");
                    if (!!clusterUrl) {
                        const u = url.parse(clusterUrl);
                        // tslint:disable:max-line-length
                        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(u.host)) {
                            // We got an IP address as host
                            app.host = `${validName(p.name)}.${app.ns}.${u.host}.nip.io`;
                            app.path = "/";
                        } else {
                            // This provider has a domain name configured; use a new subdomain and path for the app.
                            app.host = `${app.workspaceId}-${app.ns}.${u.host}`.toLowerCase();
                            app.path = `/${validName(p.name)}`;

                            app.ingressSpec = {
                                metadata: {
                                    annotations: {
                                        "nginx.ingress.kubernetes.io/rewrite-target": "/",
                                    },
                                },
                            };
                        }
                    }
                }
            }
        }

        const dockerRegistries = await ctx.graphClient.query<DockerRegistryProvider.Query, DockerRegistryProvider.Variables>({
            name: "DockerRegistryProvider",
            variables: {
                name: `docker-${ctx.workspaceId.toLowerCase()}`,
            },
            options: QueryNoCacheOptions,
        });

        if (!!dockerRegistries && !!dockerRegistries.DockerRegistryProvider) {

            const dockerConfig = {
                auths: {},
            } as any;

            for (const dockerRegistry of dockerRegistries.DockerRegistryProvider) {

                const credential = await ctx.graphClient.query<Password.Query, Password.Variables>({
                    name: "Password",
                    variables: {
                        id: dockerRegistry.credential.id,
                    },
                });

                dockerConfig.auths[dockerRegistry.url] = {
                    auth: Buffer.from(credential.Password[0].owner.login + ":" + credential.Password[0].secret).toString("base64"),
                };
            }

            const secret: DeepPartial<k8s.V1Secret> = {
                apiVersion: "v1",
                kind: "Secret",
                metadata: {
                    name: "sdm-imagepullsecret",
                },
                type: "kubernetes.io/dockerconfigjson",
                stringData: {
                    ".dockerconfigjson": JSON.stringify(dockerConfig),
                },
            };
            if (!!app.secrets) {
                app.secrets.push(secret);
            } else {
                app.secrets = [secret];
            }
            app.imagePullSecret = "sdm-imagepullsecret";
        }

        return app;
    };
}
