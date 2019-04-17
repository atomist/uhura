import { projectUtils } from "@atomist/automation-client";
import {
    Autofix,
    AutofixRegistration,
    CodeTransform,
    DefaultGoalNameGenerator,
    doWithProject,
    ExecuteGoal,
    ExecuteGoalResult,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefinitionFrom,
    Goal,
    GoalDefinition,
    GoalProjectListenerEvent,
    goals,
    ImplementationRegistration,
    IndependentOfEnvironment,
    isMaterialChange,
    LogSuppressor,
    mergeOptions,
    spawnLog,
} from "@atomist/sdm";
import {
    postLinkImageWebhook,
    Tag,
    Version,
} from "@atomist/sdm-core";
import {
    AutofixRegisteringInterpreter,
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import { Build } from "@atomist/sdm-pack-build";
import {
    DefaultDockerImageNameCreator,
    DockerBuild,
    DockerBuildRegistration,
    DockerOptions,
    DockerProgressReporter,
} from "@atomist/sdm-pack-docker";
import {
    gradleBuilder,
    GradleDefaultOptions,
    GradleProjectVersioner,
    GradleVersion,
    mavenBuilder,
    MavenDefaultOptions,
    MavenProjectVersioner,
    MvnVersion,
} from "@atomist/sdm-pack-spring";
import { gradleCommand } from "@atomist/sdm-pack-spring/lib/gradle/build/gradleBuilder";
import { determineGradleCommand } from "@atomist/sdm-pack-spring/lib/gradle/gradleCommand";
import { JHipsterStack } from "./jhipsterScanner";

export class JHipsterInterpreter implements Interpreter {
    private readonly buildGoal: Build = new Build()
        .with({
            ...GradleDefaultOptions,
            builder: gradleBuilder(),
        })
        .with({
            ...MavenDefaultOptions,
            builder: mavenBuilder(),
        })
        .withProjectListener(GradleVersion)
        .withProjectListener(MvnVersion);

    private readonly tagGoal: Tag = new Tag();

    private readonly versionGoal: Version = new Version()
        .with({
            ...GradleDefaultOptions,
            versioner: GradleProjectVersioner,
        })
        .with({
            ...MavenDefaultOptions,
            versioner: MavenProjectVersioner,
        });

    private readonly dockerBuildGoal: GradleJibDockerBuild = new GradleJibDockerBuild()
        .with({
            progressReporter: DockerProgressReporter,
            logInterpreter: LogSuppressor,
        });

    public async enrich(interpretation: Interpretation): Promise<boolean> {
        const jhipsterStack = interpretation.reason.analysis.elements.jhipster as JHipsterStack;
        if (!jhipsterStack) {
            return false;
        }

        const buildGoals = goals("build")
            .plan(this.versionGoal)
            .plan(this.buildGoal).after(this.versionGoal);
        interpretation.containerBuildGoals = goals("docker build")
                .plan(this.dockerBuildGoal);
        interpretation.buildGoals = buildGoals;
        interpretation.releaseGoals = goals("release").plan(this.tagGoal);
        interpretation.materialChangePushTests.push(isMaterialChange({
            extensions: ["java", "kt", "kts", "xml", "properties", "gradle", "yml", "json", "pug", "html", "css", "Dockerfile", "ts"],
            directories: [".atomist"],
        }));

        interpretation.materialChangePushTests.push(isMaterialChange({
            files: ["Dockerfile"],
        }));
        return true;
    }
}

const DefaultDockerOptions: DockerOptions = {
    dockerImageNameCreator: DefaultDockerImageNameCreator,
    push: false,
};

export class GradleJibDockerBuild extends FulfillableGoalWithRegistrations<DockerBuildRegistration> {
    constructor(private readonly goalDetailsOrUniqueName: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("gradle-jib-docker-build"),
                ...dependsOn: Goal[]) {

        super(getGoalDefinitionFrom(
            goalDetailsOrUniqueName,
            DefaultGoalNameGenerator.generateName("gradle-jib-docker-build"),
            JibDockerBuildDefinition)
            , ...dependsOn);
    }

    public with(registration: DockerBuildRegistration): this {
        const optsToUse = mergeOptions<DockerOptions>(DefaultDockerOptions, registration.options);

        // Backwards compatibility
        // tslint:disable:deprecation
        if (!!registration.imageNameCreator && (!registration.options || !registration.options.dockerImageNameCreator)) {
            optsToUse.dockerImageNameCreator = registration.imageNameCreator;
        }
        // tslint:enable:deprecation

        this.addFulfillment({
            goalExecutor: executeGradleJibDockerBuild(optsToUse),
            name: DefaultGoalNameGenerator.generateName("gradle-jib-docker-builder"),
            progressReporter: DockerProgressReporter,
            ...registration as ImplementationRegistration,
        });
        return this;
    }
}

export function executeGradleJibDockerBuild(options: DockerOptions): ExecuteGoal {
    return doWithProject(async gi => {
        const {goalEvent, context, project} = gi;

        const optsToUse = mergeOptions<DockerOptions>(options, {}, "docker.build");

        const imageName = await optsToUse.dockerImageNameCreator(project, goalEvent, optsToUse, context);
        const images = imageName.tags.map(tag => `${imageName.registry ? `${imageName.registry}/` : ""}${imageName.name}:${tag}`);

        const gradle = await determineGradleCommand(gi.project);
        const result = await gi.spawn(gradle, [`jibDockerBuild`,
            `--image=${images[0]}`,
            `-Djib.to.auth.username=${optsToUse.user}`,
            `-Djib.to.auth.password=${optsToUse.password}`,
            `-Djib.console=plain`], {log: gi.progressLog});

        if (await postLinkImageWebhook(
            goalEvent.repo.owner,
            goalEvent.repo.name,
            goalEvent.sha,
            images[0],
            context.workspaceId)) {
            return result;
        } else {
            return { code: 1, message: "Image link failed" };
        }
    }, {
        readOnly: true,
        detachHead: false,
    });
}

const JibDockerBuildDefinition: GoalDefinition = {
    uniqueName: "docker-build",
    displayName: "docker build",
    environment: IndependentOfEnvironment,
    workingDescription: "Running docker build",
    completedDescription: "Docker build successful",
    failedDescription: "Docker build failed",
    isolated: true,
    retryFeasible: true,
};
