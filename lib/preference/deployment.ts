import { QueryNoCacheOptions } from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    PreferenceScope,
    SdmContext,
    slackSuccessMessage,
    slackWarningMessage,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import {
    codeLine,
    italic,
    url,
} from "@atomist/slack-messages";
import { KubernetesClusterProvider } from "../typings/types";

export interface ClusterAndNamespace {
    cluster: string;
    ns: string;
}

export interface DeploymentMapping {
    testing: ClusterAndNamespace;
    production: ClusterAndNamespace;
};

export function configureDeploymentCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ phase: string, cluster: string, ns: string }> {
    return {
        name: "ConfigureDeployment",
        intent: `configure deployment ${sdm.configuration.name.replace("@", "")}`,
        description: "Configure deployment to k8s clusters",
        autoSubmit: true,
        parameters: {
            phase: {
                required: true,
                type: { kind: "single", options: [{ value: "testing", description: "Testing" }, { value: "production", description: "Production" }] },
            },
            cluster: {
                required: false,
                type: "string",
            },
            ns: {
                required: false,
                type: "string",
            },
        },
        listener: async ci => {
            // Validate that we have a k8s cluster provider in the workspace
            const k8sClusterResult = await ci.context.graphClient.query<KubernetesClusterProvider.Query, KubernetesClusterProvider.Variables>({
                name: "KubernetesClusterProvider",
                options: QueryNoCacheOptions,
            });
            let k8sClusters: string[] = [];
            if (!k8sClusterResult.KubernetesClusterProvider || k8sClusterResult.KubernetesClusterProvider.length === 0) {
                await ci.addressChannels(
                    slackWarningMessage(
                        "Configure Deployment",
                        `No Kubernetes clusters have been registered with this workspace.

Please follow ${url("https://docs.atomist.com/pack/kubernetes/", "instructions")} to configure a Kubernetes cluster.`, ci.context));
                return;
            } else {
                k8sClusters = k8sClusterResult.KubernetesClusterProvider.map(k => k.name);
            }

            // Now ask for the actual mapping from the phase to the cluster and namespace
            const mapping = await ci.promptFor<ClusterAndNamespace>({
                cluster: { type: { kind: "single", options: k8sClusters.map(c => ({ value: c, description: c })) } },
                ns: { type: "string" },
            });

            await ci.preferences.put(`k8s.deployment.${ci.parameters.phase}`, mapping, { scope: PreferenceScope.Sdm });
            await ci.addressChannels(
                slackSuccessMessage(
                    "Configure Deployment",
                    `Successfully configured ${italic(ci.parameters.phase)} deployments for ${codeLine(`${mapping.cluster}:${mapping.ns}`)}`));
        },
    };
}

export async function getCustomDeploymentMapping(ctx: SdmContext): Promise<DeploymentMapping> {
    return {
        testing: await ctx.preferences.get(`k8s.deployment.testing`, { scope: PreferenceScope.Sdm, defaultValue: undefined }),
        production: await ctx.preferences.get(`k8s.deployment.production`, { scope: PreferenceScope.Sdm, defaultValue: undefined }),
    };
}
