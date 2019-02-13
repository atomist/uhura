# Universal SDM

Universal SDM provides an integrated solution for software delivery. It can create applications, build and deploy them, and help keep projects up to date.

An Atomist **software delivery machine** is capable of automating nearly anything you care about in your software delivery.

Presently it supports the build and deployment of Node projects to Kubernetes. In future, it will support more technology stacks and deployment targets.

You can use its out of the box features, or fully embrace Atomist's philosophy of "do it in code."

[SDD manifesto](https://sdd-manifesto.org)

## Concepts

Self service for your team

What it does - graphic

Broader automation

You might be wondering how this differs from a cloud CI service such as Travis or Circle. While some of the benefits are similar, the differences are illuminating:

- Atomist does not use a pipeline per repo, but push rules that can react to a push against any repo. This means that Atomist works with organizational policies rather than repo by repo behavior, avoiding duplication and increasing consistency and velocity.
- Atomist can respond to events other than pushes, such as raising issues
- Atomist can automate many important tasks that are not addressed by traditional CI, such as automatically fixing errors.
- Atomist is customizable in code.


Adoption path

- Lay out the boxes


## Customizing Universal SDM

### Custom Seed Projects

Atomist's unique take on project creation

By default, Atomist uses global seeds that are available to all users.

You can edit your own seeds
What this means

Relevant commands

- `add seed`: erer
- `import seed`: erer
- `list seeds`: List seeds available in the current organization.
- `delete seed`: 

### Building Existing Projects

Atomist can deploy projects that it did not create. To do this you need to invoke your process

sdm enable command

#### Node projects: package.json

Currently universal SDM supports Node applications only. To make a Node application build, you will need to do the following:

- Ensure that there is a `test` script.
- If it is a TypeScript project, ensure there is a `build` script.
- Ensure that you don't depend on global....
- Enable the universal SDM on the project. Do this via the **********

#### Docker

Add a Docker file

What are the requirements for Docker?

### Customizing Kubernetes Delivery

2 approaches

- *Add spec files in your repo*. ***
- *Generate specs* in code. ***


### ChatOps

When you start with Atomist, you'll be working with our web dashboard. Atomist also had great ChatOps support. Add a Slack team via 
******

### Customizing Delivery

Atomist is customizable ---

Some examples of customization:

- Adding an "autofix"
- Adding a code inspection
- Adding a custom "push reaction"

Advanced:

- Implement your own **goals**. A goal constitutes a stage in delivery.
- Implement your own "scanner" to deliver new kinds of applications ******


Please refer to the Atomist developer documentation for guidance on the Atomist API.


## To Learn More

Resources:

- SDD manifesto
- Atomist developer docs

Open source projects:

- SDM
- global-sdm


## Roadmap

Universal SDM is designed to accommodate many capabilities. Over the next few months, we expect to support:

- *Additional developer stacks*. Spring Boot support will probably be next.
- *Additional deployment targets*. We are currently looking at AWS Lambda.
- *Visibility into the projects* in your organization, built on our analysis foundation.


