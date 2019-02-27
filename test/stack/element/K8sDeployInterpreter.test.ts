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
