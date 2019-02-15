import {
    analyzerBuilder,
    PlaceholderTransformRecipeContributor,
    preferencesScanner,
    SnipTransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import { DockerBuildInterpreter } from "../element/docker/DockerBuildInterpreter";
import { dockerScanner } from "../element/docker/dockerScanner";
import { K8sDeployInterpreter } from "../element/k8s/K8sDeployInterpreter";
import { k8sScanner } from "../element/k8s/k8sScanner";
import { NodeStackSupport } from "../element/node/nodeStackSupport";
import { SpringBootStackSupport } from "../element/spring-boot/springBootStackSupport";
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
        .withStack(NodeStackSupport)
        .withStack(SpringBootStackSupport)
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
