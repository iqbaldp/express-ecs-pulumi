import * as awsx from "@pulumi/awsx";
import { Repository } from "@pulumi/aws/ecr";

// Configure ECR
const repo = new Repository("my/test/express-app");

// ECS Cluster
const myCluster = new awsx.ecs.Cluster("pulumi-ecs");

// ALB
const listener = new awsx.lb.ApplicationListener("pulumi-ecs-primary", {
  external: true,
  port: 80,
});

// ECS Container + Tasks
const taskDefinition = new awsx.ecs.FargateTaskDefinition(
  "pulumi-ecs-primary",
  {
    containers: {
      expressApp: {
        image: awsx.ecs.Image.fromDockerBuild(repo, {
          context: "../app/",
          dockerfile: "../app/Dockerfile",
        }),
        portMappings: [listener],
        environment: [
          {
            name: "SOME_ENV_VARIABLE",
            value: "SOME_VALUE",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": "expressApp-container",
            "awslogs-region": "ap-southeast-1",
            "awslogs-stream-prefix": "expressApp",
          },
        },
      },
    },
  }
);

//Create our Fargate service
const fargateService = new awsx.ecs.FargateService("pulumi-ecs", {
  cluster: myCluster,
  desiredCount: 1,
  healthCheckGracePeriodSeconds: 10,
  taskDefinition: taskDefinition,
});

// Export the load balancer's address
export const ecsTaskUrl = listener.endpoint.hostname;
