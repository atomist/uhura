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

import { InMemoryProject } from "@atomist/automation-client";
import { KubernetesApplication } from "@atomist/sdm-pack-k8s";
import * as assert from "power-assert";
import { applicationDataCallback } from "../../../lib/element/k8s/K8sDeployInterpreter";

describe("K8sDeployInterpreter", () => {

    describe("applicationDataCallback", () => {

        it("should merge deployment spec", async () => {
            let app: KubernetesApplication = {
                workspaceId: "123456",
                deploymentSpec: {
                    spec: {
                        template: {
                            spec: {
                                containers: [{
                                    livenessProbe: {
                                        httpGet: {
                                            path: "/api",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                    },
                                    readinessProbe: {
                                        httpGet: {
                                            path: "/api",
                                            port: "http",
                                            scheme: "HTTP",
                                        },
                                    },
                                }],
                            },
                        },
                    },
                },
            } as any;
            app = await applicationDataCallback(app, new InMemoryProject({
                owner: "foo",
                repo: "bar",
            } as any) as any, undefined, {} as any);

            assert(!!app.host);
            assert(!!app.deploymentSpec.metadata.labels);
            assert(!!app.deploymentSpec.spec.template.spec.containers[0]);
            assert(!!app.ingressSpec);
        });

    });

});
